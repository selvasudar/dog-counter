import { PrismaClient, Behavior, ClusterStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Rajapalayam coordinates roughly: 9.4533, 77.5523
  console.log("Seeding dummy data around Rajapalayam...")

  // Cluster 1: Calm dogs (Center)
  await prisma.cluster.create({
    data: {
      centerLat: 9.4533,
      centerLng: 77.5523,
      reportCount: 2,
      totalDogEstimate: 4,
      dominantBehaviorTag: Behavior.CALM,
      lastReportedAt: new Date(),
      status: ClusterStatus.REPORTED,
    }
  });

  // Cluster 2: Puppies present
  await prisma.cluster.create({
    data: {
      centerLat: 9.4510,
      centerLng: 77.5540,
      reportCount: 3,
      totalDogEstimate: 5,
      dominantBehaviorTag: Behavior.PUPPIES_PRESENT,
      lastReportedAt: new Date(),
      status: ClusterStatus.ASSIGNED,
    }
  });

  // Cluster 3: Aggressive
  await prisma.cluster.create({
    data: {
      centerLat: 9.4550,
      centerLng: 77.5500,
      reportCount: 5,
      totalDogEstimate: 3,
      dominantBehaviorTag: Behavior.AGGRESSIVE,
      lastReportedAt: new Date(),
      status: ClusterStatus.REPORTED,
    }
  });

  // Cluster 4: Sick/Injured
  await prisma.cluster.create({
    data: {
      centerLat: 9.4500,
      centerLng: 77.5500,
      reportCount: 1,
      totalDogEstimate: 1,
      dominantBehaviorTag: Behavior.SICK_OR_INJURED,
      lastReportedAt: new Date(),
      status: ClusterStatus.ACTION_TAKEN,
    }
  });

  // Let's add a few raw reports as well, though MVP clustering relies on Clusters for public view
  await prisma.report.create({
    data: {
      latitude: 9.4533,
      longitude: 77.5523,
      dogCount: 4,
      behaviorTag: Behavior.CALM,
      deviceId: "dummy-device-1",
    }
  });

  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
