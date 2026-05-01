"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Check, AlertCircle,
         Scale, Shield, Users, FileText, Landmark, ShoppingCart, Brain, Gavel } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useCaseForm } from "../hooks/useCaseForm";
import { Step1_BasicInfo }    from "./Step1_BasicInfo";
import { Step2_Plaintiff }    from "./Step2_Plaintiff";
import { Step3_Defendant }    from "./Step3_Defendant";
import { Step4_ExtraParties } from "./Step4_ExtraParties";
import { Step5_Advocate }     from "./Step5_Advocate";
import { Step6_AiReview }     from "./Step6_AiReview";

const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"] });

const STEPS = [
  { label: "Case Info",     icon: <Gavel size={12}/>,     opt: false },
  { label: "Plaintiff",     icon: <Users size={12}/>,     opt: false },
  { label: "Defendant",     icon: <Shield size={12}/>,    opt: false },
  { label: "Extra Parties", icon: <Users size={12}/>,     opt: true  },
  { label: "Advocate",      icon: <Scale size={12}/>,     opt: true  },
  { label: "AI & Review",   icon: <Brain size={12}/>,     opt: false },
];

type Props = { open: boolean; onClose: () => void; onSuccess: () => void };

export function CaseSlideOver({ open, onClose, onSuccess }: Props) {
  const {
    step, form, errors, submitting, analyzing, aiResult, submitError,
    setField, setPartyField, setExtraPartyField, setAdvocateField,
    addExtraParty, removeExtraParty,
    next, back, submit, analyzeWithAI, reset,
  } = useCaseForm(() => { onSuccess(); onClose(); });

  const handleClose = () => { reset(); onClose(); };
  const isOptional = step === 4 || step === 5;
  const isLast     = step === 6;
  const progress   = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md" />

          {/* Panel */}
          <motion.aside
            initial={{ x:"100%", opacity:0 }}
            animate={{ x:0, opacity:1 }}
            exit={{ x:"100%", opacity:0 }}
            transition={{ type:"spring", damping:30, stiffness:280 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
            style={{ width:"min(620px,100vw)", background:"#090d1b",
              borderLeft:"1px solid rgba(40,50,80,0.8)",
              boxShadow:"-30px 0 80px rgba(0,0,0,0.6)" }}>

            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background:"rgba(40,50,80,0.5)" }}>
              <motion.div className="h-full"
                animate={{ width:`${progress}%` }}
                transition={{ type:"spring", damping:25 }}
                style={{ background:"linear-gradient(90deg,#7c6ef7,#d4af37)" }}/>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5"
              style={{ borderBottom:"1px solid rgba(40,50,80,0.6)", flexShrink:0 }}>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center"
                    style={{ background:"rgba(124,110,247,0.15)", border:"1px solid rgba(124,110,247,0.25)" }}>
                    <Gavel size={11} style={{ color:"#9d8fff" }}/>
                  </div>
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color:"#5a5a7a" }}>
                    OPEN NEW MATTER · STEP {step} OF {STEPS.length}
                  </p>
                </div>
                <h2 className={`${playfair.className} text-[22px] font-semibold text-white leading-snug`}>
                  {STEPS[step-1].label}
                  {isOptional && (
                    <span className="ml-2 text-xs font-sans font-semibold px-2 py-0.5 rounded-full align-middle"
                      style={{ background:"rgba(255,255,255,0.05)", color:"#404060", border:"1px solid rgba(40,50,80,1)" }}>
                      optional
                    </span>
                  )}
                </h2>
              </div>
              <button onClick={handleClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all group"
                style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(40,50,80,1)", color:"#404060" }}
                onMouseOver={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#ededed"; }}
                onMouseOut={e  => { e.currentTarget.style.borderColor="rgba(40,50,80,1)"; e.currentTarget.style.color="#404060"; }}>
                <X size={15}/>
              </button>
            </div>

            {/* Step dots */}
            <div className="flex items-center px-7 py-3 gap-1.5" style={{ borderBottom:"1px solid rgba(40,50,80,0.4)", flexShrink:0 }}>
              {STEPS.map((s, i) => {
                const n = i+1, done = step>n, active = step===n;
                return (
                  <div key={s.label} className="flex items-center gap-1.5 flex-1 last:flex-none">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <motion.div
                        animate={{ scale: active ? 1.1 : 1 }}
                        className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: done ? "rgba(212,175,55,0.15)" : active ? "rgba(124,110,247,0.2)" : "rgba(255,255,255,0.03)",
                          border: `1.5px solid ${done ? "rgba(212,175,55,0.4)" : active ? "rgba(124,110,247,0.55)" : "rgba(40,50,80,1)"}`,
                          boxShadow: active ? "0 0 12px rgba(124,110,247,0.25)" : "none",
                        }}>
                        {done
                          ? <Check size={10} style={{ color:"#d4af37" }}/>
                          : <span style={{ fontSize:9, fontWeight:700, color: active?"#9d8fff":"#303050" }}>{n}</span>}
                      </motion.div>
                      <span className="hidden sm:block text-[10px] font-semibold"
                        style={{ color: active?"#c4b5ff" : done?"#7a6a32":"#303050" }}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length-1 && (
                      <div className="flex-1 h-px mx-1"
                        style={{ background: done ? "rgba(212,175,55,0.25)" : "rgba(40,50,80,1)" }}/>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-7 py-6">
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
            </div>

            {/* Footer */}
            <div className="px-7 py-4 flex items-center justify-between gap-3"
              style={{ borderTop:"1px solid rgba(40,50,80,0.5)", background:"rgba(5,8,18,0.6)", flexShrink:0 }}>
              <motion.button whileHover={{ x:-2 }} onClick={step===1 ? handleClose : back}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(40,50,80,1)", color:"#505070" }}
                onMouseOver={e => { e.currentTarget.style.color="#ededed"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"; }}
                onMouseOut={e  => { e.currentTarget.style.color="#505070"; e.currentTarget.style.borderColor="rgba(40,50,80,1)"; }}>
                <ChevronLeft size={14}/>
                {step===1 ? "Cancel" : "Back"}
              </motion.button>

              <div className="flex items-center gap-2">
                {isOptional && (
                  <button onClick={next}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(40,50,80,1)", color:"#404060" }}
                    onMouseOver={e => { e.currentTarget.style.color="#8a8aaa"; }}
                    onMouseOut={e  => { e.currentTarget.style.color="#404060"; }}>
                    Skip
                  </button>
                )}
                {isLast && (
                  <button onClick={submit} disabled={submitting}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                    style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(40,50,80,1)", color:"#505070" }}>
                    {submitting ? "Saving…" : "Skip AI & Save"}
                  </button>
                )}

                {!isLast ? (
                  <motion.button onClick={next}
                    whileHover={{ scale:1.03, boxShadow:"0 0 28px rgba(124,110,247,0.35)" }}
                    whileTap={{ scale:0.97 }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background:"linear-gradient(135deg,#7c6ef7,#5a4fcf)", color:"#fff" }}>
                    Continue <ChevronRight size={14}/>
                  </motion.button>
                ) : (
                  <motion.button onClick={submit} disabled={submitting}
                    whileHover={{ scale: submitting?1:1.03, boxShadow: submitting?"none":"0 0 28px rgba(212,175,55,0.35)" }}
                    whileTap={{ scale: submitting?1:0.97 }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background:"linear-gradient(135deg,#d4af37,#a87d1a)", color:"#070b16" }}>
                    {submitting
                      ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-black/30 border-t-black animate-spin"/>Saving…</>
                      : <><Check size={14}/>Save Case</>}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
