"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Check, AlertCircle } from "lucide-react";
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
  { label: "Case Info",     short: "1" },
  { label: "Plaintiff",     short: "2" },
  { label: "Defendant",     short: "3" },
  { label: "Extra Parties", short: "4" },
  { label: "Advocate",      short: "5" },
  { label: "AI & Review",   short: "6" },
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

  // Steps 4 and 5 are optional — allow skipping
  const isOptionalStep = step === 4 || step === 5;
  const isLastStep = step === 6;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />

          {/* Slide-over panel */}
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
            style={{ width: "min(640px, 100vw)", background: "#0a0e1c", borderLeft: "1px solid rgba(30,38,66,1)", boxShadow: "-20px 0 60px rgba(0,0,0,0.5)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid rgba(30,38,66,1)", flexShrink: 0 }}>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: "#7c6ef7" }}>CASE MANAGEMENT</p>
                <h2 className={`${playfair.className} text-xl font-medium text-white`}>
                  Open New <span style={{ color: "#d4af37", fontStyle: "italic" }}>Matter</span>
                </h2>
              </div>
              <button onClick={handleClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", color: "#4a4a62" }}
                onMouseOver={(e) => { e.currentTarget.style.color = "#ededed"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                onMouseOut={(e)  => { e.currentTarget.style.color = "#4a4a62"; e.currentTarget.style.borderColor = "rgba(30,38,66,1)"; }}>
                <X size={16} />
              </button>
            </div>

            {/* Step indicator — horizontal scrollable pill row */}
            <div className="px-5 py-3 flex items-center gap-1.5 overflow-x-auto"
              style={{ borderBottom: "1px solid rgba(30,38,66,1)", flexShrink: 0 }}>
              {STEPS.map((s, i) => {
                const num = i + 1;
                const done   = step > num;
                const active = step === num;
                const opt    = num === 4 || num === 5;
                return (
                  <div key={s.label} className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all"
                      style={{
                        background: done ? "rgba(212,175,55,0.1)" : active ? "rgba(124,110,247,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${done ? "rgba(212,175,55,0.3)" : active ? "rgba(124,110,247,0.4)" : "rgba(30,38,66,1)"}`,
                      }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{
                          background: done ? "rgba(212,175,55,0.2)" : active ? "rgba(124,110,247,0.3)" : "rgba(255,255,255,0.05)",
                          color: done ? "#d4af37" : active ? "#9d8fff" : "#3a3a52",
                        }}>
                        {done ? <Check size={8} /> : num}
                      </span>
                      <span className="text-[10px] font-semibold hidden sm:block"
                        style={{ color: done ? "#d4af37" : active ? "#c4b5ff" : "#3a3a52" }}>
                        {s.label}
                      </span>
                      {opt && !active && !done && (
                        <span className="text-[8px] px-1 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#3a3a52" }}>OPT</span>
                      )}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-3 h-px" style={{ background: done ? "rgba(212,175,55,0.3)" : "rgba(30,38,66,1)" }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <Step1_BasicInfo form={form} errors={errors} setField={setField} />
                )}
                {step === 2 && (
                  <Step2_Plaintiff form={form} errors={errors} setPartyField={setPartyField} />
                )}
                {step === 3 && (
                  <Step3_Defendant form={form} errors={errors} setPartyField={setPartyField} />
                )}
                {step === 4 && (
                  <Step4_ExtraParties form={form} errors={errors}
                    addExtraParty={addExtraParty} removeExtraParty={removeExtraParty}
                    setExtraPartyField={setExtraPartyField} />
                )}
                {step === 5 && (
                  <Step5_Advocate form={form} errors={errors} setAdvocateField={setAdvocateField} />
                )}
                {step === 6 && (
                  <Step6_AiReview form={form} errors={errors} setField={setField}
                    onAnalyze={analyzeWithAI} analyzing={analyzing} aiResult={aiResult} />
                )}
              </AnimatePresence>

              {/* Submit error */}
              <AnimatePresence>
                {submitError && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-4 flex items-center gap-2.5 rounded-xl p-3 text-sm"
                    style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
                    <AlertCircle size={14} className="shrink-0" />
                    {submitError}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex items-center justify-between gap-3"
              style={{ borderTop: "1px solid rgba(30,38,66,1)", background: "rgba(0,0,0,0.2)", flexShrink: 0 }}>
              <button onClick={step === 1 ? handleClose : back}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", color: "#6a6a82" }}
                onMouseOver={(e) => { e.currentTarget.style.color = "#ededed"; }}
                onMouseOut={(e)  => { e.currentTarget.style.color = "#6a6a82"; }}>
                <ChevronLeft size={15} />
                {step === 1 ? "Cancel" : "Back"}
              </button>

              <div className="flex items-center gap-2">
                {/* Skip for optional steps */}
                {isOptionalStep && (
                  <button onClick={next}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(30,38,66,1)", color: "#4a4a62" }}>
                    Skip
                  </button>
                )}

                {/* Skip AI & Submit (step 6) */}
                {isLastStep && (
                  <button onClick={submit} disabled={submitting}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(30,38,66,1)", color: "#6a6a82" }}>
                    {submitting ? "Saving..." : "Skip AI & Save"}
                  </button>
                )}

                {/* Next / Save */}
                {!isLastStep ? (
                  <motion.button onClick={next}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", color: "#070b16" }}>
                    Continue <ChevronRight size={15} />
                  </motion.button>
                ) : (
                  <motion.button onClick={submit} disabled={submitting}
                    whileHover={{ scale: submitting ? 1 : 1.02 }} whileTap={{ scale: submitting ? 1 : 0.98 }}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", color: "#070b16", boxShadow: "0 0 24px rgba(124,110,247,0.3)" }}>
                    {submitting ? (
                      <><span className="w-4 h-4 rounded-full border-2 border-[#070b16]/30 border-t-[#070b16] animate-spin" />Saving...</>
                    ) : (
                      <><Check size={15} />Save Case</>
                    )}
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
