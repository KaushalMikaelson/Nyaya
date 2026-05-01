"use client";

import { motion } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";
import { CaseFormData } from "../hooks/useCaseForm";
import { FormField, TextArea, TagInput } from "./FormPrimitives";

type Props = {
  form: CaseFormData;
  errors: Partial<Record<keyof CaseFormData, string>>;
  setField: <K extends keyof CaseFormData>(key: K, value: CaseFormData[K]) => void;
  onAnalyze: () => void;
  analyzing: boolean;
};

export function Step3_AiContext({ form, errors, setField, onAnalyze, analyzing }: Props) {
  return (
    <motion.div key="step3" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }} className="space-y-5">

      {/* AI explainer banner */}
      <div className="rounded-2xl p-4 flex gap-3"
        style={{ background: "rgba(124,110,247,0.06)", border: "1px solid rgba(124,110,247,0.18)" }}>
        <Brain size={18} style={{ color: "#9d8fff", flexShrink: 0, marginTop: 2 }} />
        <div>
          <p className="text-xs font-bold mb-1" style={{ color: "#9d8fff" }}>AI Legal Analysis (Optional)</p>
          <p className="text-xs leading-relaxed" style={{ color: "#6a6a82" }}>
            Fill in the facts below and click "Analyze with Nyaya AI" to get relevant acts, case insights, risk assessment, and suggested remedies — powered by RAG over Indian law.
          </p>
        </div>
      </div>

      <FormField label="Facts of the Case" error={errors.factSummary}>
        <TextArea
          value={form.factSummary}
          onChange={(v) => setField("factSummary", v)}
          placeholder="Describe the key facts in plain language. Be specific about dates, events, and parties involved..."
          rows={6}
          error={!!errors.factSummary}
        />
        <p className="text-xs mt-1 text-right" style={{ color: form.factSummary.length > 2800 ? "#f87171" : "#3a3a52" }}>
          {form.factSummary.length}/3000
        </p>
      </FormField>

      <FormField label="Relief Sought">
        <TextArea
          value={form.reliefSought}
          onChange={(v) => setField("reliefSought", v)}
          placeholder="What remedy or relief is the petitioner seeking? e.g. Stay order, damages, quashing of FIR..."
          rows={3}
        />
      </FormField>

      <FormField label="Acts / Sections Involved">
        <TagInput
          tags={form.actsInvolved}
          onChange={(v) => setField("actsInvolved", v)}
          placeholder="IPC 420, CrPC 482, Article 21..."
        />
        <p className="text-xs mt-1" style={{ color: "#3a3a52" }}>
          Type an act/section and press Enter to add it.
        </p>
      </FormField>

      {/* Analyze button */}
      <motion.button
        type="button"
        onClick={onAnalyze}
        disabled={analyzing || form.factSummary.trim().length < 20}
        whileHover={{ scale: analyzing ? 1 : 1.015 }}
        whileTap={{ scale: analyzing ? 1 : 0.975 }}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg, #7c6ef7, #9d8fff)", color: "#fff", boxShadow: analyzing ? "none" : "0 0 30px rgba(124,110,247,0.3)" }}
      >
        {analyzing ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Analyzing with Nyaya AI...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Analyze with Nyaya AI
          </>
        )}
      </motion.button>

      {form.factSummary.trim().length < 20 && (
        <p className="text-center text-xs" style={{ color: "#3a3a52" }}>
          Add at least 20 characters of facts to enable AI analysis.
        </p>
      )}
    </motion.div>
  );
}
