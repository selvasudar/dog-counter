import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Behavior, ClusterStatus } from "@prisma/client";

// Haversine formula to calculate distance in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

const severityMap: Record<Behavior, number> = {
  SICK_OR_INJURED: 4,
  AGGRESSIVE: 3,
  PUPPIES_PRESENT: 2,
  CALM: 1,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { latitude, longitude, dogCount, behaviorTag, phoneNumber, deviceId } = body;

    if (!latitude || !longitude || !dogCount || !behaviorTag || !deviceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Rate Limiting Check
    // Prevent same device from reporting within 50m in last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentDeviceReports = await prisma.report.findMany({
      where: {
        deviceId,
        createdAt: { gte: yesterday }
      }
    });

    const isSpam = recentDeviceReports.some(r => 
      getDistanceInMeters(r.latitude, r.longitude, latitude, longitude) <= 50
    );

    if (isSpam) {
      return NextResponse.json({ error: "You have already reported in this area recently." }, { status: 429 });
    }

    // 2. Save Report
    await prisma.report.create({
      data: {
        latitude,
        longitude,
        dogCount,
        behaviorTag: behaviorTag as Behavior,
        phoneNumber,
        deviceId
      }
    });

    // 3. Clustering Logic
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const activeClusters = await prisma.cluster.findMany({
      where: {
        lastReportedAt: { gte: fourteenDaysAgo }
      }
    });

    // Find if within 50m of any active cluster
    let targetCluster = null;
    let minDistance = Infinity;

    for (const cluster of activeClusters) {
      const dist = getDistanceInMeters(cluster.centerLat, cluster.centerLng, latitude, longitude);
      if (dist <= 50 && dist < minDistance) {
        minDistance = dist;
        targetCluster = cluster;
      }
    }

    if (targetCluster) {
      // Update existing cluster
      // We need all reports in this cluster to calculate median and centroid accurately,
      // but for MVP performance, we can do a rolling update:
      
      const newReportCount = targetCluster.reportCount + 1;
      
      // Moving average for centroid
      const newLat = ((targetCluster.centerLat * targetCluster.reportCount) + latitude) / newReportCount;
      const newLng = ((targetCluster.centerLng * targetCluster.reportCount) + longitude) / newReportCount;
      
      // Max dog count (as requested: median or max. Max is safer for rolling update without fetching all)
      const newDogEstimate = Math.max(targetCluster.totalDogEstimate, dogCount);

      // Dominant behavior
      let newDominantBehavior = targetCluster.dominantBehaviorTag;
      if (severityMap[behaviorTag as Behavior] > severityMap[targetCluster.dominantBehaviorTag]) {
        newDominantBehavior = behaviorTag as Behavior;
      }

      await prisma.cluster.update({
        where: { id: targetCluster.id },
        data: {
          centerLat: newLat,
          centerLng: newLng,
          reportCount: newReportCount,
          totalDogEstimate: newDogEstimate,
          dominantBehaviorTag: newDominantBehavior,
          lastReportedAt: new Date(),
          status: ClusterStatus.REPORTED // reset status if action was taken but new reports come in? Or leave it. Let's reset to reported since it's a new sighting.
        }
      });
    } else {
      // Create new cluster
      await prisma.cluster.create({
        data: {
          centerLat: latitude,
          centerLng: longitude,
          reportCount: 1,
          totalDogEstimate: dogCount,
          dominantBehaviorTag: behaviorTag as Behavior,
          lastReportedAt: new Date(),
          status: ClusterStatus.REPORTED
        }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Report submission error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
