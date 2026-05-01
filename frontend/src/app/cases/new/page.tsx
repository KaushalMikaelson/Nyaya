"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel, Scale, Shield, Users, Brain, Check,
  ChevronLeft, ChevronRight, AlertCircle, ArrowLeft,
} from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useCaseForm } from "../hooks/useCaseForm";
import { Step1_BasicInfo }    from "../components/Step1_BasicInfo";
import { Step2_Plaintiff }    from "../components/Step2_Plaintiff";
import { Step3_Defendant }    from "../components/Step3_Defendant";
import { Step4_ExtraParties } from "../components/Step4_ExtraParties";
import { Step5_Advocate }     from "../components/Step5_Advocate";
import { Step6_AiReview }     from "../components/Step6_AiReview";

const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"] });

const STEPS = [
  { label:"Case Information", sub:"Title, type, court & legal details",  Icon:Gavel,  opt:false, color:"#7c6ef7" },
  { label:"Plaintiff",        sub:"Petitioner / filing party details",    Icon:Users,  opt:false, color:"#60a5fa" },
  { label:"Defendant",        sub:"Respondent / opposing party details",  Icon:Shield, opt:false, color:"#f87171" },
  { label:"Extra Parties",    sub:"Witnesses, interveners, co-parties",   Icon:Users,  opt:true,  color:"#fb923c" },
  { label:"Advocate",         sub:"Counsel on record information",        Icon:Scale,  opt:true,  color:"#d4af37" },
  { label:"AI & Review",      sub:"Facts, AI analysis & final review",    Icon:Brain,  opt:false, color:"#a78bfa" },
];

export default function NewCasePage() {
  const router = useRouter();

  const {
    step, form, errors, submitting, analyzing, aiResult, submitError,
    setField, setPartyField, setExtraPartyField, setAdvocateField,
    addExtraParty, removeExtraParty,
    next, back, submit, analyzeWithAI, reset,
  } = useCaseForm(() => router.push("/cases"));

  const isOptional = step === 4 || step === 5;
  const isLast     = step === 6;
  const progress   = ((step - 1) / (STEPS.length - 1)) * 100;
  const current    = STEPS[step - 1];

  return (
    <div className="min-h-screen flex flex-col" style={{ background:"#070b16", color:"#e2e8f0" }}>

      {/* ── Top progress bar ────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5" style={{ background:"rgba(40,50,80,0.5)" }}>
        <motion.div animate={{ width:`${progress}%` }} transition={{ type:"spring", damping:28 }}
          className="h-full" style={{ background:"linear-gradient(90deg,#7c6ef7,#d4af37)" }}/>
      </div>

      {/* ── Top nav bar ────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4"
        style={{ background:"rgba(7,11,22,0.9)", borderBottom:"1px solid rgba(40,50,80,0.6)", backdropFilter:"blur(12px)" }}>
        <button onClick={() => { reset(); router.push("/cases"); }}
          className="flex items-center gap-2 text-sm font-semibold transition-all"
          style={{ color:"#505070" }}
          onMouseOver={e => e.currentTarget.style.color="#ededed"}
          onMouseOut={e  => e.currentTarget.style.color="#505070"}>
          <ArrowLeft size={15}/> Cases
        </button>
        <div className="flex items-center gap-2">
          <p className={`${playfair.className} text-lg font-medium text-white`}>
            Open New <span style={{ color:"#d4af37", fontStyle:"italic" }}>Matter</span>
          </p>
        </div>
        <div className="text-xs font-medium" style={{ color:"#404060" }}>
          Step {step} of {STEPS.length}
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────── */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full px-6 py-10 gap-8">

        {/* ── Left sidebar ─────────────────────────────── */}
        <aside className="hidden lg:flex flex-col gap-2 w-64 shrink-0 pt-1">
          {/* Sticky wrapper */}
          <div className="sticky top-24">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-5" style={{ color:"#404060" }}>
              FORM STEPS
            </p>
            {STEPS.map((s, i) => {
              const n = i+1, done = step>n, active = step===n;
              return (
                <div key={s.label} className="flex gap-3 mb-1">
                  {/* Connector line */}
                  <div className="flex flex-col items-center" style={{ width:28 }}>
                    <motion.div animate={{ scale: active?1.1:1 }}
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all"
                      style={{
                        background: done ? "rgba(212,175,55,0.12)" : active ? `${s.color}20` : "rgba(255,255,255,0.03)",
                        border: `1.5px solid ${done ? "rgba(212,175,55,0.35)" : active ? s.color+"60" : "rgba(40,50,80,0.9)"}`,
                        boxShadow: active ? `0 0 14px ${s.color}30` : "none",
                      }}>
                      {done
                        ? <Check size={12} style={{ color:"#d4af37" }}/>
                        : <s.Icon size={12} style={{ color: active ? s.color : "#303050" }}/>}
                    </motion.div>
                    {i < STEPS.length-1 && (
                      <div className="w-px flex-1 my-1"
                        style={{ background: done ? "rgba(212,175,55,0.2)" : "rgba(40,50,80,0.6)", minHeight:20 }}/>
                    )}
                  </div>
                  {/* Label */}
                  <div className="pb-5 min-w-0">
                    <p className="text-sm font-semibold leading-none mb-1 transition-colors"
                      style={{ color: active ? "#e2e8f0" : done ? "#7a6a32" : "#383858" }}>
                      {s.label}
                      {s.opt && !active && !done && (
                        <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                          style={{ background:"rgba(255,255,255,0.04)", color:"#303050", border:"1px solid rgba(40,50,80,1)" }}>
                          opt
                        </span>
                      )}
                    </p>
                    {active && (
                      <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }}
                        className="text-[11px]" style={{ color: s.color }}>
                        {s.sub}
                      </motion.p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Mini stats of filled data */}
            {step > 1 && (
              <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                className="mt-4 rounded-xl p-3.5 space-y-2"
                style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(40,50,80,0.7)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color:"#404060" }}>PROGRESS</p>
                {[
                  { label:"Case type",  value: form.caseType },
                  { label:"Plaintiff",  value: form.plaintiff.fullName },
                  { label:"Defendant",  value: form.defendant.fullName },
                  { label:"Advocate",   value: form.advocate.fullName },
                ].map(r => r.value ? (
                  <div key={r.label} className="flex justify-between gap-2">
                    <span className="text-[10px]" style={{ color:"#404060" }}>{r.label}</span>
                    <span className="text-[10px] font-semibold text-right truncate max-w-[110px]"
                      style={{ color:"#7a6a82" }}>{r.value}</span>
                  </div>
                ) : null)}
              </motion.div>
            )}
          </div>
        </aside>

        {/* ── Form content ─────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {/* Step heading */}
          <motion.div key={step} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background:`${current.color}15`, border:`1px solid ${current.color}30` }}>
                <current.Icon size={17} style={{ color:current.color }}/>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color:current.color }}>
                  STEP {step} {isOptional ? "· OPTIONAL" : ""}
                </p>
                <h1 className={`${playfair.className} text-2xl font-semibold text-white leading-tight`}>
                  {current.label}
                </h1>
              </div>
            </div>
            <p className="text-sm ml-12" style={{ color:"#404060" }}>{current.sub}</p>
          </motion.div>

          {/* Form panel */}
          <div className="rounded-2xl p-8"
            style={{ background:"rgba(10,14,28,0.9)", border:"1px solid rgba(40,50,80,0.7)", minHeight:400 }}>
            <AnimatePresence mode="wait">
              {step===1 && <Step1_BasicInfo form={form} errors={errors} setField={setField}/>}
              {step===2 && <Step2_Plaintiff form={form} errors={errors} setPartyField={setPartyField}/>}
              {step===3 && <Step3_Defendant form={form} errors={errors} setPartyField={setPartyField}/>}
              {step===4 && <Step4_ExtraParties form={form} errors={errors}
                addExtraParty={addExtraParty} removeExtraParty={removeExtraParty}
                setExtraPartyField={setExtraPartyField}/>}
              {step===5 && <Step5_Advocate form={form} errors={errors} setAdvocateField={setAdvocateField}/>}
              {step===6 && <Step6_AiReview form={form} errors={errors} setField={setField}
                onAnalyze={analyzeWithAI} analyzing={analyzing} aiResult={aiResult}/>}
            </AnimatePresence>
          </div>

          {/* Error */}
          <AnimatePresence>
            {submitError && (
              <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                className="mt-4 flex items-center gap-2.5 rounded-xl p-3.5 text-sm"
                style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171" }}>
                <AlertCircle size={14} className="shrink-0"/>
                {submitError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 gap-3">
            <motion.button whileHover={{ x:-2 }} onClick={step===1 ? () => { reset(); router.push("/cases"); } : back}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(40,50,80,1)", color:"#505070" }}
              onMouseOver={e=>{ e.currentTarget.style.color="#ededed"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; }}
              onMouseOut={e=>{ e.currentTarget.style.color="#505070"; e.currentTarget.style.borderColor="rgba(40,50,80,1)"; }}>
              <ChevronLeft size={15}/>
              {step===1 ? "Back to Cases" : "Previous"}
            </motion.button>

            <div className="flex items-center gap-3">
              {/* Mobile step indicator */}
              <div className="flex items-center gap-1 lg:hidden">
                {STEPS.map((_,i) => (
                  <div key={i} className="rounded-full transition-all"
                    style={{ width: step===i+1?16:6, height:6,
                      background: step>i+1 ? "#d4af37" : step===i+1 ? "#7c6ef7" : "rgba(40,50,80,1)" }}/>
                ))}
              </div>

              {isOptional && (
                <button onClick={next}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all"
                  style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(40,50,80,1)", color:"#404060" }}
                  onMouseOver={e=>{ e.currentTarget.style.color="#8a8aaa"; }}
                  onMouseOut={e=>{ e.currentTarget.style.color="#404060"; }}>
                  Skip
                </button>
              )}

              {isLast && (
                <button onClick={submit} disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(40,50,80,1)", color:"#505070" }}>
                  {submitting ? "Saving…" : "Skip AI & Save"}
                </button>
              )}

              {!isLast ? (
                <motion.button onClick={next}
                  whileHover={{ scale:1.03, boxShadow:"0 0 28px rgba(124,110,247,0.4)" }}
                  whileTap={{ scale:0.97 }}
                  className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background:"linear-gradient(135deg,#7c6ef7,#5a4fcf)", color:"#fff" }}>
                  Continue <ChevronRight size={14}/>
                </motion.button>
              ) : (
                <motion.button onClick={submit} disabled={submitting}
                  whileHover={{ scale:submitting?1:1.03, boxShadow:submitting?"none":"0 0 28px rgba(212,175,55,0.4)" }}
                  whileTap={{ scale:submitting?1:0.97 }}
                  className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background:"linear-gradient(135deg,#d4af37,#a87d1a)", color:"#070b16" }}>
                  {submitting
                    ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-black/30 border-t-black animate-spin"/>Saving…</>
                    : <><Check size={14}/>Save Case</>}
                </motion.button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
