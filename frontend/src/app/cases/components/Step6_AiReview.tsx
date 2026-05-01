"use client";

import { motion } from "framer-motion";
import { Brain, Sparkles, CheckCircle2 } from "lucide-react";
import { CaseFormData } from "../hooks/useCaseForm";
import { FormField, TextArea, TagInput } from "./FormPrimitives";
import { AiAnalysisPanel } from "./AiAnalysisPanel";
import { AiAnalysis } from "../hooks/useCaseForm";

type Props = {
  form: CaseFormData;
  errors: Record<string, string>;
  setField: <K extends keyof CaseFormData>(key: K, value: CaseFormData[K]) => void;
  onAnalyze: () => void;
  analyzing: boolean;
  aiResult: AiAnalysis | null;
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-start gap-2 py-1.5"
    style={{ borderBottom: "1px solid rgba(30,38,66,0.6)" }}>
    <span className="text-xs shrink-0" style={{ color: "#4a4a62" }}>{label}</span>
    <span className="text-xs text-right font-medium" style={{ color: "#a1a1aa" }}>{value || "—"}</span>
  </div>
);

export function Step6_AiReview({ form, errors, setField, onAnalyze, analyzing, aiResult }: Props) {
  return (
    <motion.div key="step6" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }} className="space-y-5">

      {/* Case review card */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(30,38,66,1)", background: "rgba(255,255,255,0.02)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2"
          style={{ borderBottom: "1px solid rgba(30,38,66,1)", background: "rgba(124,110,247,0.06)" }}>
          <CheckCircle2 size={14} style={{ color: "#9d8fff" }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#9d8fff" }}>Case Summary Review</p>
        </div>
        <div className="p-4">
          <SummaryRow label="Title" value={form.title} />
          <SummaryRow label="Type" value={form.caseType} />
          <SummaryRow label="Priority" value={form.priority} />
          <SummaryRow label="Act / Section" value={form.actSection} />
          <SummaryRow label="FIR Number" value={form.firNumber} />
          <SummaryRow label="Court" value={[form.court, form.courtLevel].filter(Boolean).join(" — ")} />
          <SummaryRow label="Plaintiff" value={form.plaintiff.fullName} />
          <SummaryRow label="Defendant" value={form.defendant.fullName} />
          <SummaryRow label="Advocate" value={form.advocate.fullName} />
          <SummaryRow label="Extra Parties" value={form.extraParties.length > 0 ? `${form.extraParties.length} added` : "None"} />
          {form.filedAt && <SummaryRow label="Filed" value={new Date(form.filedAt).toLocaleDateString("en-IN")} />}
          {form.limitationDate && <SummaryRow label="Limitation" value={new Date(form.limitationDate).toLocaleDateString("en-IN")} />}
        </div>
      </div>

      {/* AI analysis section */}
      <div className="rounded-2xl p-3.5 flex gap-3"
        style={{ background: "rgba(124,110,247,0.06)", border: "1px solid rgba(124,110,247,0.18)" }}>
        <Brain size={17} style={{ color: "#9d8fff", flexShrink: 0, marginTop: 2 }} />
        <div>
          <p className="text-xs font-bold mb-1" style={{ color: "#9d8fff" }}>AI Legal Analysis (Optional)</p>
          <p className="text-xs leading-relaxed" style={{ color: "#6a6a82" }}>
            Describe the facts and Nyaya AI will retrieve relevant Indian laws, summarise the case, assess risk, and suggest remedies using RAG over legal provisions.
          </p>
        </div>
      </div>

      <FormField label="Facts of the Case" error={errors["factSummary"]}>
        <TextArea value={form.factSummary} onChange={(v) => setField("factSummary", v)}
          placeholder="Describe the key facts in plain language — dates, events, parties involved..."
          rows={5} error={!!errors["factSummary"]} />
        <p className="text-xs mt-1 text-right"
          style={{ color: form.factSummary.length > 2800 ? "#f87171" : "#3a3a52" }}>
          {form.factSummary.length}/3000
        </p>
      </FormField>

      <FormField label="Relief Sought">
        <TextArea value={form.reliefSought} onChange={(v) => setField("reliefSought", v)}
          placeholder="What remedy does the petitioner seek? e.g. Stay order, damages, quashing of FIR..."
          rows={3} />
      </FormField>

      <FormField label="Acts / Sections Involved">
        <TagInput tags={form.actsInvolved} onChange={(v) => setField("actsInvolved", v)}
          placeholder="IPC 420, CrPC 482, Article 21..." />
      </FormField>

      {/* Analyze button */}
      <motion.button type="button" onClick={onAnalyze}
        disabled={analyzing || form.factSummary.trim().length < 20}
        whileHover={{ scale: analyzing ? 1 : 1.015 }}
        whileTap={{ scale: analyzing ? 1 : 0.975 }}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg, #7c6ef7, #9d8fff)", color: "#fff", boxShadow: analyzing ? "none" : "0 0 28px rgba(124,110,247,0.3)" }}>
        {analyzing ? (
          <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Analyzing...</>
        ) : (
          <><Sparkles size={16} />Analyze with Nyaya AI</>
        )}
      </motion.button>

      {form.factSummary.trim().length < 20 && (
        <p className="text-center text-xs" style={{ color: "#3a3a52" }}>
          Provide at least 20 characters to enable AI analysis.
        </p>
      )}

      {/* AI result */}
      {aiResult && <AiAnalysisPanel result={aiResult} />}
    </motion.div>
  );
}
