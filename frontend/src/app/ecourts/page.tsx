"use client";

import React, { useState } from "react";
import { ArrowLeft, Search, Scale, FileText, Calendar, Building2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function ECourtsTracker() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [form, setForm] = useState({
    caseNumber: "",
    court: "",
    year: new Date().getFullYear().toString(),
  });

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.caseNumber || !form.court || !form.year) return;

    setLoading(true);
    setResult(null);

    try {
      const { data } = await api.post("/ecourts/track", form);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      alert("Failed to track case via eCourts. Please verify the case number.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: "#070b16" }}>
      {/* Header */}
      <header className="flex items-center h-16 px-4 sticky top-0 z-10"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(7,7,13,0.8)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => router.push("/")} className="mr-4 p-2 rounded-xl transition-colors hover:bg-white/5" style={{ color: "#a0a0bd" }}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
            <Search size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">eCourts Live Tracking</h1>
            <p className="text-xs" style={{ color: "#7a7a90" }}>Sync & Track National Grid Cases</p>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto p-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Form */}
        <div className="lg:col-span-5">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Sync eCourts Docket</h2>
            <p className="text-sm leading-relaxed" style={{ color: "#9090a8" }}>
              Pull real-time status, hearing dates, and historical orders directly from the Indian eCourts infrastructure.
            </p>
          </div>

          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#a0a0bd" }}>Registration Number (CNR) *</label>
              <input type="text"
                value={form.caseNumber} onChange={e => setForm({...form, caseNumber: e.target.value})}
                placeholder="e.g. MHBO010043122022"
                className="w-full px-4 py-3 rounded-xl bg-transparent outline-none transition-all text-sm uppercase"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} required
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#a0a0bd" }}>Establishment *</label>
                <select 
                  value={form.court} onChange={e => setForm({...form, court: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-transparent outline-none transition-all text-sm"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} required>
                  <option value="" disabled className="bg-slate-900">Select Court</option>
                  <option value="District Court Pune" className="bg-slate-900">District Court Pune</option>
                  <option value="Bombay High Court" className="bg-slate-900">Bombay High Court</option>
                  <option value="Delhi High Court" className="bg-slate-900">Delhi High Court</option>
                  <option value="Supreme Court of India" className="bg-slate-900">Supreme Court of India</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#a0a0bd" }}>Filing Year *</label>
                <input type="number" min="1990" max="2026"
                  value={form.year} onChange={e => setForm({...form, year: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-transparent outline-none transition-all text-sm"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !form.caseNumber || !form.court}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 mt-4"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}
            >
              {loading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : <Search size={18} />}
              {loading ? "Querying National Grid..." : "Track Case"}
            </button>
            <p className="text-xs text-center mt-3 text-slate-500">Note: API uses a simulated staging proxy.</p>
          </form>
        </div>

        {/* Right Col: Output */}
        <div className="lg:col-span-7 h-full flex flex-col">
          <div className="flex-1 rounded-2xl w-full p-6"
            style={{ 
              background: "#11111a", 
              border: "1px solid rgba(255,255,255,0.05)",
              boxShadow: "inset 0 4px 20px rgba(0,0,0,0.2)"
            }}>
            
            {!result && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 min-h-[400px]">
                <Scale size={48} className="mb-4" />
                <p className="text-sm">Enter CNR or Case details to pull official records.</p>
              </div>
            )}
            
            {loading && (
               <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
                 <div className="animate-pulse flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <div className="text-sm font-semibold" style={{ color: "#a0a0bd" }}>Connecting to eCourts Services...</div>
                 </div>
               </div>
            )}

            {result && !loading && (
              <div className="space-y-6">
                
                {/* Header Block */}
                <div className="flex justify-between items-start border-b border-white/10 pb-5">
                  <div>
                    <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-wider">{result.cino}</h3>
                    <p className="text-sm text-slate-400 font-medium">Under {result.act} Sec {result.section}</p>
                  </div>
                  <span className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${result.status.toLowerCase() === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    {result.status}
                  </span>
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1.5"><User size={12}/> Petitioner</p>
                    <p className="text-sm font-bold text-white truncate">{result.petitioner}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">Adv. {result.petitionerAdvocate}</p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1.5"><User size={12}/> Respondent</p>
                    <p className="text-sm font-bold text-white truncate">{result.respondent}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">Adv. {result.respondentAdvocate}</p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1.5"><Building2 size={12}/> Court</p>
                    <p className="text-sm font-bold text-white truncate">{form.court}</p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1.5"><Scale size={12}/> Honorable Judge</p>
                    <p className="text-sm font-bold text-white truncate">{result.judge}</p>
                  </div>
                </div>

                {/* Hearing Dates */}
                <div className="flex items-center gap-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Calendar size={24} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-0.5">Next Hearing Date</p>
                    <p className="text-xl font-black text-white">{result.nextHearingDate}</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-lg transition-colors">
                    Add to Case
                  </button>
                </div>

                {/* History Table */}
                <div>
                   <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><FileText size={14} className="text-slate-400"/> Hearing History</h4>
                   <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
                     <table className="w-full text-left text-xs">
                       <thead className="bg-white/5 text-slate-400 uppercase tracking-wider font-semibold">
                         <tr>
                           <th className="px-4 py-3">Date</th>
                           <th className="px-4 py-3">Business</th>
                           <th className="px-4 py-3">Purpose</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5 text-slate-300">
                         {result.history.map((h: any, i: number) => (
                           <tr key={i} className="hover:bg-white/5 transition-colors">
                             <td className="px-4 py-3 font-medium">{h.date}</td>
                             <td className="px-4 py-3">{h.businessOnDate}</td>
                             <td className="px-4 py-3">{h.hearingPurpose}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
