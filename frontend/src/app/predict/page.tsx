"use client";

import React, { useState } from "react";
import { ArrowLeft, Clock, ShieldCheck, Scale, TrendingUp, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function CasePredictor() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [form, setForm] = useState({
    caseType: "",
    court: "",
    jurisdiction: "",
    complexity: "Medium",
    facts: "",
  });

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.caseType || !form.court) return;

    setLoading(true);
    setResult(null);

    try {
      const { data } = await api.post("/predict", form);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      alert("Failed to predict case duration. Please try again.");
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
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f43f5e, #fb923c)" }}>
            <Clock size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">AI Case Predictor</h1>
            <p className="text-xs" style={{ color: "#7a7a90" }}>Duration & Outcome Forecasting</p>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto p-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Col: Form */}
        <div>
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Forecast Case Timeline</h2>
            <p className="text-sm leading-relaxed" style={{ color: "#9090a8" }}>
              Nyaay leverages historical Indian court data and AI to estimate how long a legal matter might take, highlighting potential bottlenecks and fast-track options.
            </p>
          </div>

          <form onSubmit={handlePredict} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#a0a0bd" }}>Case Type *</label>
                <select 
                  value={form.caseType} onChange={e => setForm({...form, caseType: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-transparent outline-none transition-all text-sm"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} required>
                  <option value="" disabled className="bg-slate-900">Select Type</option>
                  <option value="Civil Suit" className="bg-slate-900">Civil Suit</option>
                  <option value="Criminal (Bailable)" className="bg-slate-900">Criminal (Bailable)</option>
                  <option value="Criminal (Non-Bailable)" className="bg-slate-900">Criminal (Non-Bailable)</option>
                  <option value="Family Dispute / Divorce" className="bg-slate-900">Family Dispute / Divorce</option>
                  <option value="Consumer Complaint" className="bg-slate-900">Consumer Complaint</option>
                  <option value="Corporate / NCLT" className="bg-slate-900">Corporate / NCLT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#a0a0bd" }}>Target Court *</label>
                <select 
                  value={form.court} onChange={e => setForm({...form, court: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-transparent outline-none transition-all text-sm"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} required>
                  <option value="" disabled className="bg-slate-900">Select Court</option>
                  <option value="District / Session Court" className="bg-slate-900">District / Session Court</option>
                  <option value="High Court" className="bg-slate-900">High Court</option>
                  <option value="Supreme Court" className="bg-slate-900">Supreme Court</option>
                  <option value="Consumer Forum" className="bg-slate-900">Consumer Forum</option>
                  <option value="Tribunal (NCLT/DRT)" className="bg-slate-900">Tribunal (NCLT/DRT)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#a0a0bd" }}>Jurisdiction / State</label>
                <input type="text" value={form.jurisdiction} onChange={e => setForm({...form, jurisdiction: e.target.value})}
                  placeholder="e.g. Maharashtra, Delhi"
                  className="w-full px-4 py-3 rounded-xl bg-transparent outline-none transition-all text-sm"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#a0a0bd" }}>Perceived Complexity</label>
                <select value={form.complexity} onChange={e => setForm({...form, complexity: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-transparent outline-none transition-all text-sm"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
                  <option value="Low" className="bg-slate-900">Low (Clear Evidence)</option>
                  <option value="Medium" className="bg-slate-900">Medium (Standard)</option>
                  <option value="High" className="bg-slate-900">High (Multiple Parties/Appeals)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#a0a0bd" }}>Core Facts / Context</label>
              <textarea
                value={form.facts} onChange={e => setForm({...form, facts: e.target.value})}
                placeholder="Briefly describe the case to improve prediction accuracy..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-transparent outline-none transition-all text-sm resize-none"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !form.caseType || !form.court}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 mt-2"
              style={{ background: "linear-gradient(135deg, #f43f5e, #fb923c)", boxShadow: "0 0 20px rgba(244,63,94,0.3)" }}
            >
              {loading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : <TrendingUp size={18} />}
              {loading ? "Running Analytics Model..." : "Generate Prediction"}
            </button>
          </form>
        </div>

        {/* Right Col: Output */}
        <div className="h-full flex flex-col">
          <div className="flex-1 rounded-2xl w-full p-6 md:p-8"
            style={{ 
              background: "#11111a", 
              border: "1px solid rgba(255,255,255,0.05)",
              boxShadow: "inset 0 4px 20px rgba(0,0,0,0.2)"
            }}>
            
            {!result && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <Clock size={48} className="mb-4" />
                <p className="text-sm max-w-xs">Enter case parameters to generate a data-backed duration forecast.</p>
              </div>
            )}
            
            {loading && (
               <div className="h-full flex flex-col items-center justify-center">
                 <div className="animate-pulse flex flex-col items-center">
                    <Scale size={32} style={{ color: "#f43f5e" }} className="mb-4 animate-bounce" />
                    <div className="text-sm font-semibold" style={{ color: "#a0a0bd" }}>Analysing Historical Case Data...</div>
                 </div>
               </div>
            )}

            {result && !loading && (
              <div className="space-y-6">
                
                <div className="text-center pb-6 border-b border-white/5">
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-2">Estimated Duration</h3>
                  <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-orange-400 mb-2">
                    {result.prediction.estimatedDurationRange}
                  </div>
                  <p className="text-sm text-slate-300">{result.prediction.verdict}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-white/5 bg-black/20">
                     <p className="text-xs text-slate-500 font-semibold mb-1">Model Confidence</p>
                     <div className="flex items-end gap-2">
                       <span className="text-2xl font-bold text-white">{result.prediction.confidence}%</span>
                       <ShieldCheck size={18} className="text-emerald-400 mb-1" />
                     </div>
                  </div>
                  <div className="p-4 rounded-xl border border-white/5 bg-black/20">
                     <p className="text-xs text-slate-500 font-semibold mb-1">Court Backlog Risk</p>
                     <div className="text-xl font-bold text-white capitalize">{result.prediction.courtBacklogRisk}</div>
                  </div>
                </div>

                {result.prediction.fastTrackEligible && (
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex gap-3 items-start">
                    <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400 shrink-0"><TrendingUp size={16} /></div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-400 mb-1">Fast-Track Eligible</h4>
                      <p className="text-xs text-emerald-200/70 leading-relaxed">{result.prediction.fastTrackReason}</p>
                    </div>
                  </div>
                )}

                <div>
                   <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><HelpCircle size={14} className="text-orange-400"/> Influencing Factors</h4>
                   <div className="space-y-2">
                     {result.prediction.factors.map((f: any, i: number) => (
                       <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                         <span className="text-sm text-slate-300">{f.factor}</span>
                         <span className={`text-xs font-bold px-2 py-1 rounded-md ${f.impact === 'positive' ? 'bg-emerald-500/20 text-emerald-400' : f.impact === 'negative' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-400'}`}>
                           {f.impact}
                         </span>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Milestone Timeline */}
                <div>
                   <h4 className="text-sm font-bold text-white mb-3">Projected Timeline</h4>
                   <div className="relative pl-3 space-y-4 before:absolute before:inset-0 before:ml-4 before:w-px before:bg-white/10">
                     {result.prediction.keyMilestones.map((m: any, i: number) => (
                       <div key={i} className="relative flex items-center gap-4">
                         <div className="w-2.5 h-2.5 rounded-full bg-orange-400 ring-4 ring-[#11111a] z-10" />
                         <div className="flex-1">
                           <p className="text-sm text-slate-200 font-medium">{m.milestone}</p>
                           <p className="text-xs text-slate-500">Month {m.estimatedMonthsFromFiling}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>

                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Strategic Recommendation</h4>
                  <p className="text-sm text-blue-100/80">{result.prediction.recommendation}</p>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
