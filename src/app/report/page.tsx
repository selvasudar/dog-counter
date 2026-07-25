"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [locating, setLocating] = useState(true);
  
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [dogCount, setDogCount] = useState<number | "">("");
  const [behavior, setBehavior] = useState("CALM");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocating(false);
        },
        (error) => {
          console.error("Location error:", error);
          setLocating(false);
          // Fallback to Rajapalayam center for MVP if denied
          setLocation({ lat: 9.4533, lng: 77.5523 });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setLocating(false);
      setLocation({ lat: 9.4533, lng: 77.5523 });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !dogCount) return;
    
    setLoading(true);
    
    // Simple device ID tracking via localStorage for rate limiting MVP
    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("device_id", deviceId);
    }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          dogCount: Number(dogCount),
          behaviorTag: behavior,
          phoneNumber: phone || null,
          deviceId
        })
      });

      if (!res.ok) throw new Error("Failed to submit");
      
      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 size={64} className="text-emerald-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h1>
        <p className="text-slate-600 max-w-sm mb-8">
          Your report has been submitted. This helps make the community safer.
        </p>
        <div className="animate-pulse text-sm text-slate-400">
          Returning to map...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b p-4 flex items-center gap-4">
        <Link href="/" className="text-slate-500 hover:text-slate-900">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="font-bold text-lg text-slate-900">Report Stray Dogs</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 p-4 flex flex-col gap-6 max-w-md mx-auto w-full mt-4">
        
        {/* Location Section */}
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold">
            <MapPin size={20} className="text-blue-500" />
            Location
          </div>
          {locating ? (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Getting your location...
            </p>
          ) : (
            <p className="text-sm text-emerald-600 font-medium">
              Location acquired automatically
            </p>
          )}
        </div>

        {/* Dog Count */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-slate-800">How many dogs did you see?</label>
          <input 
            type="number" 
            min="1" 
            max="50"
            required
            value={dogCount}
            onChange={(e) => setDogCount(e.target.value ? Number(e.target.value) : "")}
            className="border-2 rounded-xl p-4 text-xl w-full text-slate-800"
            placeholder="e.g. 3"
          />
        </div>

        {/* Behavior */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-slate-800">Behavior / Condition</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: "CALM", label: "Calm", color: "bg-emerald-500" },
              { id: "PUPPIES_PRESENT", label: "Puppies Present", color: "bg-yellow-500" },
              { id: "AGGRESSIVE", label: "Aggressive", color: "bg-orange-500" },
              { id: "SICK_OR_INJURED", label: "Sick / Injured", color: "bg-red-500" },
            ].map(b => (
              <div 
                key={b.id}
                onClick={() => setBehavior(b.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                  behavior === b.id ? 'border-slate-800 bg-slate-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${b.color}`}></div>
                <span className={`font-medium ${behavior === b.id ? 'text-slate-900' : 'text-slate-600'}`}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Optional Phone */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-slate-800 flex justify-between">
            Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input 
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border-2 rounded-xl p-4 w-full text-slate-800"
            placeholder="For internal follow-up only"
          />
        </div>

        <button 
          type="submit"
          disabled={loading || locating || !dogCount}
          className="mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 active:scale-95"
        >
          {loading ? <Loader2 className="animate-spin" /> : "SUBMIT REPORT"}
        </button>

      </form>
    </main>
  );
}
