"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // In a real app, authentication happens server-side via session cookies.
  // For this pitch MVP, we fetch clusters (which are public anyway for the map)
  // and only require the PIN to execute status updates. 
  // We'll require the PIN up-front to "login" to the dashboard.
  
  useEffect(() => {
    // If they have the PIN in localStorage, auto-login for convenience during demo
    const savedPin = localStorage.getItem("admin_pin");
    if (savedPin === "1234") { // Hardcoded for pitch MVP, matches .env
      setPin(savedPin);
      setAuthenticated(true);
      fetchClusters(savedPin);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "1234") {
      localStorage.setItem("admin_pin", pin);
      setAuthenticated(true);
      fetchClusters(pin);
    } else {
      alert("Invalid PIN");
    }
  };

  const fetchClusters = async (overridePin?: string) => {
    setLoading(true);
    try {
      const currentPin = overridePin || pin;
      const res = await fetch("/api/admin/clusters?pin=" + currentPin);
      if (res.ok) {
        const data = await res.json();
        setClusters(data.clusters);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (clusterId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/clusters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clusterId, status, pin })
      });
      if (res.ok) {
        // Optimistic update
        setClusters(clusters.map(c => c.id === clusterId ? { ...c, status } : c));
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      alert("Error updating status");
    }
  };

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <ShieldCheck size={64} className="text-blue-500 mb-6" />
        <h1 className="text-2xl font-bold mb-8">Admin Access</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-xs">
          <input 
            type="password"
            placeholder="Enter PIN (1234)"
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="p-4 rounded-xl text-center text-xl text-slate-900 bg-white border-2 border-transparent focus:border-blue-500 outline-none"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-bold transition-colors shadow-lg">
            LOGIN
          </button>
        </form>
        <Link href="/" className="mt-8 text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
          <ArrowLeft size={16} /> Back to Map
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-bold text-lg flex items-center gap-2 tracking-tight">
            <ShieldCheck className="text-blue-500" size={20} /> Dashboard
          </h1>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem("admin_pin");
            setAuthenticated(false);
            setPin("");
          }}
          className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition-colors"
        >
          Logout
        </button>
      </header>

      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Active Clusters</h2>
          
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
          ) : clusters.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border text-center text-slate-500 shadow-sm">
              No clusters found.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {clusters.map(cluster => (
                <div key={cluster.id} className="bg-white p-5 rounded-xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-slate-900 text-lg">{cluster.totalDogEstimate} Dogs</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        cluster.dominantBehaviorTag === 'SICK_OR_INJURED' ? 'bg-red-100 text-red-700' :
                        cluster.dominantBehaviorTag === 'AGGRESSIVE' ? 'bg-orange-100 text-orange-700' :
                        cluster.dominantBehaviorTag === 'PUPPIES_PRESENT' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {cluster.dominantBehaviorTag.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mb-1">
                      <span className="font-medium text-slate-800">Reports:</span> {cluster.reportCount} 
                      <span className="mx-2 text-slate-300">|</span> 
                      <span className="font-medium text-slate-800">Last active:</span> {new Date(cluster.lastReportedAt).toLocaleDateString()}
                    </div>
                    {cluster.phoneNumbers && cluster.phoneNumbers.length > 0 && (
                      <div className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border inline-block">
                        <span className="font-medium text-slate-800 mb-1 block">Reporter Contacts:</span>
                        <div className="flex flex-col gap-1">
                          {cluster.phoneNumbers.map((phone: string, idx: number) => (
                            <a key={idx} href={`tel:${phone}`} className="text-blue-600 hover:underline">{phone}</a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <select 
                      value={cluster.status}
                      onChange={(e) => updateStatus(cluster.id, e.target.value)}
                      className={`text-sm font-bold border-2 rounded-lg p-2.5 outline-none cursor-pointer ${
                        cluster.status === 'REPORTED' ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' :
                        cluster.status === 'ASSIGNED' ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' :
                        cluster.status === 'ACTION_TAKEN' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100' :
                        'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      <option value="REPORTED">🔴 Reported</option>
                      <option value="ASSIGNED">🔵 Assigned</option>
                      <option value="ACTION_TAKEN">🟡 Action Taken</option>
                      <option value="RESOLVED">🟢 Resolved</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
