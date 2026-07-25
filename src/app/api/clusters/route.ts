import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// We force dynamic so this endpoint always hits the DB fresh
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clusters = await prisma.cluster.findMany({
      orderBy: { reportCount: 'desc' }
    });
    
    return NextResponse.json({ clusters });
  } catch (error) {
    console.error("Failed to fetch clusters:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
