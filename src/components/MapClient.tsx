"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Rajapalayam Center
const CENTER: [number, number] = [9.4533, 77.5523];
const ZOOM = 15;

function getBehaviorColor(behavior: string) {
  switch (behavior) {
    case "CALM": return "#10b981"; // emerald-500
    case "PUPPIES_PRESENT": return "#eab308"; // yellow-500
    case "AGGRESSIVE": return "#f97316"; // orange-500
    case "SICK_OR_INJURED": return "#ef4444"; // red-500
    default: return "#3b82f6"; // blue-500
  }
}

function getMarkerSize(count: number) {
  // Base size 12px, add 4px per dog, max 40px
  return Math.min(12 + count * 4, 40);
}

// Custom icon creator
const createClusterIcon = (cluster: any) => {
  const size = getMarkerSize(cluster.totalDogEstimate);
  const color = getBehaviorColor(cluster.dominantBehaviorTag);
  
  const html = `
    <div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${size > 20 ? '12px' : '10px'};
      opacity: 0.9;
    ">
      ${cluster.totalDogEstimate}
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-leaflet-cluster-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export default function MapClient({ clusters }: { clusters: any[] }) {
  // Fix for Next.js missing window error during initial render
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <MapContainer 
      center={CENTER} 
      zoom={ZOOM} 
      style={{ height: "100%", width: "100%", position: "absolute", inset: 0, zIndex: 1 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {clusters.map((cluster) => (
        <Marker 
          key={cluster.id} 
          position={[cluster.centerLat, cluster.centerLng]}
          icon={createClusterIcon(cluster)}
        >
          <Popup>
            <div className="text-center">
              <strong className="block text-lg mb-1">{cluster.totalDogEstimate} Dogs</strong>
              <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs rounded-full inline-block">
                {cluster.dominantBehaviorTag.replace(/_/g, ' ')}
              </span>
              <p className="text-xs text-slate-500 mt-2">
                Confirmed by {cluster.reportCount} report(s)
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
