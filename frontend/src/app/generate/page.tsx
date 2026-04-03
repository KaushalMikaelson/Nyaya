"use client";

import React, { useState } from "react";
import { Copy, ArrowLeft, PenTool, Check, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import api from "@/lib/api";

export default function DocumentGenerator() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [form, setForm] = useState({
    docType: "",
    partyA: "",
    partyB: "",
    specifics: "",
    prompt: "",
  });

  const [generatedResult, setGeneratedResult] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prompt.trim() && !form.docType.trim()) return;

    setLoading(true);
    setGeneratedResult(null);

    try {
      const { data } = await api.post("/generate", form);
      setGeneratedResult(data.document);
    } catch (err: unknown) {
      console.error(err);
      if (err && typeof err === 'object' && 'response' in err && (err as {response?: {status?: number}}).response?.status === 403) {
        alert("Free Query limits reached. Please Upgrade to Pro.");
      } else {
        alert("Failed to generate document. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedResult) {
      navigator.clipboard.writeText(generatedResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: "#07070d" }}>
      {/* Top Header */}
      <header className="flex block md:hidden items-center h-14 px-4 sticky top-0 z-10"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(7,7,13,0.8)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => router.push("/")} className="mr-3 p-1.5 rounded-lg transition-colors" style={{ color: "#a0a0bd" }}>
          <ArrowLeft size={20} />
        </button>
        <div className="font-semibold text-sm">Document Generator</div>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto p-4 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Col: Form */}
        <div>
          <button onClick={() => router.push("/")} className="hidden md:flex items-center gap-2 mb-8 text-sm font-medium transition-colors" style={{ color: "#9090a8" }}
            onMouseOver={e=>e.currentTarget.style.color="#fff"} onMouseOut={e=>e.currentTarget.style.color="#9090a8"}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Legal Draft Generator</h1>
            <p className="text-sm md:text-base leading-relaxed" style={{ color: "#9090a8" }}>
              Nyaay&apos;s RAG-augmented hybrid engine constructs highly-structured, court-ready templates referencing legitimate Indian Laws directly.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#a0a0bd" }}>Document Type</label>
              <input type="text"
                value={form.docType} onChange={e => setForm({...form, docType: e.target.value})}
                placeholder="e.g. Non-Disclosure Agreement, Legal Notice for Default"
                className="w-full px-4 py-3 rounded-xl bg-transparent outline-none transition-all text-sm"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#a0a0bd" }}>Party A (Sender)</label>
                <input type="text"
                  value={form.partyA} onChange={e => setForm({...form, partyA: e.target.value})}
                  placeholder="e.g. John Doe, ABC Corp"
                  className="w-full px-4 py-3 rounded-xl bg-transparent outline-none transition-all text-sm"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#a0a0bd" }}>Party B (Receiver)</label>
                <input type="text"
                  value={form.partyB} onChange={e => setForm({...form, partyB: e.target.value})}
                  placeholder="e.g. Jane Smith, XYZ Inc"
                  className="w-full px-4 py-3 rounded-xl bg-transparent outline-none transition-all text-sm"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#a0a0bd" }}>Specific Demands / Core Facts</label>
              <textarea
                value={form.specifics} onChange={e => setForm({...form, specifics: e.target.value})}
                placeholder="e.g. Demanding payment of Rs 50,000 within 15 days or legal action will be taken."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-transparent outline-none transition-all text-sm resize-none"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#a0a0bd" }}>Tone / Additional Instructions</label>
              <input type="text"
                value={form.prompt} onChange={e => setForm({...form, prompt: e.target.value})}
                placeholder="e.g. Ensure it references IPC provisions strictly"
                className="w-full px-4 py-3 rounded-xl bg-transparent outline-none transition-all text-sm"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !form.prompt.trim()}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 20px rgba(124,110,247,0.3)" }}
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Drafting Legal Document...
                </>
              ) : (
                <>
                  <PenTool size={18} />
                  Generate Draft
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Col: Output */}
        <div className="h-full flex flex-col flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight">Draft Output Engine</h2>
            {generatedResult && (
              <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: copied ? "rgba(34,197,94,0.1)" : "rgba(124,110,247,0.1)", color: copied ? "#4ade80" : "#a855f7" }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Target"}
              </button>
            )}
          </div>
          
          <div className="flex-1 rounded-2xl w-full min-h-[500px] overflow-y-auto p-6 md:p-8"
            style={{ 
              background: "#11111a", 
              border: "1px solid rgba(255,255,255,0.05)",
              boxShadow: "inset 0 4px 20px rgba(0,0,0,0.2)"
            }}>
            {!generatedResult && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <FileText size={48} className="mb-4" />
                <p className="text-sm">Enter constraints on the left to spawn the Draft Algorithm.</p>
              </div>
            )}
            
            {loading && (
               <div className="h-full flex flex-col items-center justify-center">
                 <div className="animate-pulse flex flex-col items-center">
                    <PenTool size={32} style={{ color: "#7c6ef7" }} className="mb-4 animate-bounce" />
                    <div className="text-sm font-semibold" style={{ color: "#a0a0bd" }}>Cross-Referencing Indian Laws...</div>
                 </div>
               </div>
            )}

            {generatedResult && !loading && (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{generatedResult}</ReactMarkdown>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
