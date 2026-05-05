"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, BarChart2, Scale, Calendar, Filter, Users, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function AnalyticsDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async (query = "") => {
    setLoading(true);
    try {
      const res = await api.get(`/analytics/judge-workload${query ? `?judgeName=${query}` : ''}`);
      const payload = Array.isArray(res.data) ? res.data : [res.data];
      setData(payload);
    } catch (err: any) {
      console.error(err);
      alert("Failed to fetch analytics.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAnalytics(search);
  };

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: "#070b16" }}>
      {/* Header */}
      <header className="flex items-center justify-between h-16 px-4 sticky top-0 z-10"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(7,7,13,0.8)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center">
          <button onClick={() => router.push("/dashboard")} className="mr-4 p-2 rounded-xl transition-colors hover:bg-white/5" style={{ color: "#a0a0bd" }}>
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
              <BarChart2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Court Workload Analytics</h1>
              <p className="text-xs" style={{ color: "#7a7a90" }}>Judicial Performance & Backlog</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 py-8">
        
        {/* Search Bar */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Judicial Registry Analytics</h2>
            <p className="text-sm" style={{ color: "#9090a8" }}>Track case disposal rates, average lifecycles, and pending backlogs across the bench.</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-md">
            <input 
              type="text" 
              placeholder="Search Judge Name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-[#11111a] border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
            />
            <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-colors">
              Filter
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
             <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((judge, idx) => (
              <div key={idx} className="bg-[#11111a] border border-white/10 rounded-2xl p-6 relative overflow-hidden transition-all hover:-translate-y-1 hover:border-blue-500/30">
                {judge.isMockData && (
                  <div className="absolute top-0 right-0 bg-rose-500/10 text-rose-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-b border-l border-rose-500/20">
                    SIMULATED DATA
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <Scale size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg leading-tight">{judge.judgeName}</h3>
                    <p className="text-xs text-blue-400">Presiding Officer</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Pending Cases</p>
                    <p className="text-2xl font-black text-rose-400">{judge.pendingCases}</p>
                  </div>
                  <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Disposed Cases</p>
                    <p className="text-2xl font-black text-emerald-400">{judge.closedCases}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                    <span className="text-slate-400 flex items-center gap-2"><Calendar size={14}/> Avg. Disposal Time</span>
                    <span className="font-semibold text-white">{judge.averageDisposalDays} days</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                    <span className="text-slate-400 flex items-center gap-2"><Users size={14}/> Hearings per Case</span>
                    <span className="font-semibold text-white">{judge.hearingsPerCase} avg</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pb-1">
                    <span className="text-slate-400 flex items-center gap-2"><TrendingUp size={14}/> Backlog Trend</span>
                    <span className={`font-semibold ${judge.backlogTrend === 'Increasing' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {judge.backlogTrend}
                    </span>
                  </div>
                </div>

              </div>
            ))}

            {data.length === 0 && (
              <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                <Filter size={40} className="mx-auto text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Judges Found</h3>
                <p className="text-slate-400">Try adjusting your search filters.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
