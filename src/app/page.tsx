import Link from "next/link";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import prisma from "@/lib/prisma";
import Map from "@/components/Map";

// Force dynamic rendering since clusters change frequently
export const dynamic = "force-dynamic";

export default async function Home() {
  // Fetch active clusters from the database
  const clusters = await prisma.cluster.findMany({
    where: {
      // For MVP, fetch all or restrict by last 14 days
      lastReportedAt: {
        gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      }
    }
  });

  return (
    <main className="flex-1 flex flex-col h-screen">
      <header className="bg-slate-900 text-white p-4 shadow-md z-20 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-orange-500" />
          <h1 className="font-bold text-lg tracking-tight">Stray Dog Safety Map</h1>
        </div>
        <Link 
          href="/admin" 
          className="text-xs text-slate-400 hover:text-white"
        >
          Admin
        </Link>
      </header>

      <div className="flex-1 relative bg-slate-100 dark:bg-slate-800">
        <Map clusters={clusters} />
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
        <Link 
          href="/report"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg active:scale-95"
        >
          <AlertTriangle size={20} />
          REPORT STRAY DOGS
        </Link>
        <p className="text-center text-xs text-slate-500 mt-3">
          Help make your community safer by reporting stray dog sightings.
        </p>
      </div>
    </main>
  );
}
