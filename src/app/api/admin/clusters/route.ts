import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ClusterStatus } from "@prisma/client";

// Haversine formula
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pin = url.searchParams.get("pin");

    if (pin !== process.env.ADMIN_PIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clusters = await prisma.cluster.findMany({
      orderBy: { reportCount: 'desc' }
    });

    // For admin, we also want phone numbers of recent reports near these clusters
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const recentReports = await prisma.report.findMany({
      where: {
        createdAt: { gte: fourteenDaysAgo },
        phoneNumber: { not: null }
      }
    });

    // Map phone numbers to clusters if they fall within 50m
    const clustersWithPhones = clusters.map(cluster => {
      const phones: string[] = [];
      for (const report of recentReports) {
        if (!report.phoneNumber) continue;
        const dist = getDistanceInMeters(cluster.centerLat, cluster.centerLng, report.latitude, report.longitude);
        if (dist <= 50) {
          phones.push(report.phoneNumber);
        }
      }
      return {
        ...cluster,
        phoneNumbers: Array.from(new Set(phones)) // Unique phones
      };
    });

    return NextResponse.json({ clusters: clustersWithPhones });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { clusterId, status, pin } = await req.json();

    // Verify PIN
    if (pin !== process.env.ADMIN_PIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!clusterId || !status) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const updated = await prisma.cluster.update({
      where: { id: clusterId },
      data: { status: status as ClusterStatus }
    });

    return NextResponse.json({ success: true, cluster: updated });
  } catch (error) {
    console.error("Admin update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
