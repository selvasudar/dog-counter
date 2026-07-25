"use client";

import dynamic from "next/dynamic";

// Dynamically import the map client component with SSR disabled
const MapClient = dynamic(() => import("./MapClient"), { 
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-0">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
    </div>
  )
});

export default function Map({ clusters }: { clusters: any[] }) {
  return <MapClient clusters={clusters} />;
}
