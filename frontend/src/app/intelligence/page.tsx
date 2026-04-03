"use client";

import React, { useState } from "react";
import { ArrowLeft, Send, Scale, MapPin, FileSignature, ShieldAlert, Crosshair } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type IntelligenceResult = {
  understanding: string;
  violatedRights: string[];
  legalPath: string[];
  documents: string[];
  courtInfo: string;
};

export default function CaseIntelligence() {
  const router = useRouter();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntelligenceResult | null>(null);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const { data } = await api.post("/intelligence", { caseDetails: input });
      setResult(data.intelligence);
    } catch (err: unknown) {
      console.error(err);
      if (err && typeof err === 'object' && 'response' in err && (err as {response?: {status?: number}}).response?.status === 403) {
        alert("Free Query limits reached. Please Upgrade to Pro.");
      } else {
        alert("Failed to analyze case. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: "#07070d" }}>
      {/* Header */}
      <header className="flex items-center h-16 px-4 sticky top-0 z-10"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(7,7,13,0.8)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => router.push("/")} className="mr-4 p-2 rounded-xl transition-colors hover:bg-white/5" style={{ color: "#a0a0bd" }}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)" }}>
            <Crosshair size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Case Intelligence Dashboard</h1>
            <p className="text-xs" style={{ color: "#7a7a90" }}>AI Case Mapping & Strategy</p>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto p-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Input Column */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Describe Your Case</h2>
            <p className="text-sm" style={{ color: "#9090a8" }}>Provide as much detail as possible. Nyaay will cross-reference Indian Law to construct your legal path.</p>
          </div>

          <div className="relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. My landlord came in and threw my things out without any notice. He also cut my electricity. What can I do?"
              className="w-full bg-[#0e0e18] rounded-2xl p-4 pb-16 text-sm resize-none outline-none transition-all"
              style={{ minHeight: "240px", border: "1px solid rgba(255,255,255,0.07)", color: "#e0e0f4" }}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !input.trim()}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xl disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)" }}
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Analyzing
                </>
              ) : (
                <>
                  Run Intelligence
                  <Send size={14} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Column */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {!result && !loading && (
            <div className="h-full flex items-center justify-center rounded-2xl border border-dashed border-white/10 opacity-30 min-h-[400px]">
              <div className="text-center">
                <Scale size={48} className="mx-auto mb-4" />
                <p>Awaiting case inputs</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-full flex items-center justify-center rounded-2xl border border-white/5 bg-[#11111a] min-h-[400px]">
              <div className="animate-pulse text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl mx-auto border-t-2 border-purple-500 animate-spin" />
                <p className="text-sm font-semibold" style={{ color: "#a0a0bd" }}>Structuring RAG Case Strategy...</p>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              
              {/* Core Understanding */}
              <div className="p-5 rounded-2xl" style={{ background: "rgba(124,110,247,0.1)", border: "1px solid rgba(124,110,247,0.2)" }}>
                <h3 className="text-sm font-bold flex items-center gap-2 mb-2" style={{ color: "#c8c8e0" }}>
                  <Crosshair size={14} className="text-purple-400" /> Executive Summary
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#e0e0f4" }}>{result.understanding}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Violated Rights */}
                <div className="p-5 rounded-2xl bg-[#11111a]" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                   <h3 className="text-sm font-bold flex items-center gap-2 mb-3" style={{ color: "#c8c8e0" }}>
                    <ShieldAlert size={14} className="text-red-400" /> Legal Rights Violated
                  </h3>
                  <ul className="space-y-2">
                    {result.violatedRights.map((right, idx) => (
                      <li key={idx} className="flex gap-2 text-sm" style={{ color: "#a0a0bd" }}>
                        <span className="text-red-400 shrink-0">•</span>
                        <span>{right}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Court Info */}
                <div className="p-5 rounded-2xl bg-[#11111a]" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                   <h3 className="text-sm font-bold flex items-center gap-2 mb-3" style={{ color: "#c8c8e0" }}>
                    <MapPin size={14} className="text-blue-400" /> Jurisdiction & Court
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#a0a0bd" }}>{result.courtInfo}</p>
                </div>
              </div>

              {/* The Legal Path */}
              <div className="p-5 rounded-2xl bg-[#11111a]" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                 <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "#c8c8e0" }}>
                  <Scale size={14} className="text-green-400" /> Your Actionable Legal Path
                </h3>
                <div className="space-y-4">
                  {result.legalPath.map((step, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" 
                        style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>
                        {idx + 1}
                      </div>
                      <p className="text-sm pt-0.5" style={{ color: "#e0e0f4" }}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Documents */}
              <div className="p-5 rounded-2xl bg-[#11111a]" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                 <h3 className="text-sm font-bold flex items-center gap-2 mb-3" style={{ color: "#c8c8e0" }}>
                  <FileSignature size={14} className="text-yellow-400" /> Documents Needed
                </h3>
                 <ul className="space-y-2">
                    {result.documents.map((doc, idx) => (
                      <li key={idx} className="flex gap-2 text-sm" style={{ color: "#a0a0bd" }}>
                        <span className="text-yellow-400 shrink-0">→</span>
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                  <button 
                    onClick={() => router.push('/generate')}
                    className="mt-4 w-full py-2.5 rounded-xl text-xs font-bold transition-colors border"
                    style={{ background: "transparent", borderColor: "rgba(255,255,255,0.1)", color: "#c8c8e0" }}
                  >
                    Go to Document Generator
                  </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
