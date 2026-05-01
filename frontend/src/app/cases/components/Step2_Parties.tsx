"use client";

import { motion } from "framer-motion";
import { CaseFormData } from "../hooks/useCaseForm";
import { FormField, TextInput } from "./FormPrimitives";

type Props = {
  form: CaseFormData;
  errors: Partial<Record<keyof CaseFormData, string>>;
  setField: <K extends keyof CaseFormData>(key: K, value: CaseFormData[K]) => void;
};

export function Step2_Parties({ form, errors, setField }: Props) {
  return (
    <motion.div key="step2" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }} className="space-y-5">

      {/* Opponent */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#4a4a62" }}>
          Opposing Party
        </p>
        <div className="space-y-4">
          <FormField label="Opponent / Respondent Name">
            <TextInput
              value={form.opponentName}
              onChange={(v) => setField("opponentName", v)}
              placeholder="e.g. Union of India"
            />
          </FormField>
          <FormField label="Opponent's Counsel">
            <TextInput
              value={form.opponentCounsel}
              onChange={(v) => setField("opponentCounsel", v)}
              placeholder="Opposing lawyer's name"
            />
          </FormField>
        </div>
      </div>

      {/* Timeline */}
      <div className="pt-1 border-t" style={{ borderColor: "rgba(30,38,66,1)" }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-3 mt-3" style={{ color: "#4a4a62" }}>
          Key Dates
        </p>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date of Filing">
            <input
              type="date"
              value={form.filedAt}
              onChange={(e) => setField("filedAt", e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", colorScheme: "dark" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.07)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(30,38,66,1)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </FormField>
          <FormField label="Limitation Deadline">
            <input
              type="date"
              value={form.limitationDate}
              onChange={(e) => setField("limitationDate", e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", colorScheme: "dark" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.07)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(30,38,66,1)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </FormField>
        </div>

        {/* Limitation warning */}
        {form.limitationDate && new Date(form.limitationDate) < new Date(Date.now() + 30 * 86400000) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-3 flex items-start gap-2.5 rounded-xl p-3 text-xs"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
            ⚠️ The limitation deadline is within 30 days. Please take immediate action.
          </motion.div>
        )}
      </div>

      {/* Firm selection notice */}
      <div className="pt-1 border-t" style={{ borderColor: "rgba(30,38,66,1)" }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-3 mt-3" style={{ color: "#4a4a62" }}>
          Firm (Optional)
        </p>
        <FormField label="Firm ID">
          <TextInput
            value={form.firmId}
            onChange={(v) => setField("firmId", v)}
            placeholder="Paste firm UUID to assign this case"
          />
        </FormField>
        <p className="text-xs mt-2" style={{ color: "#3a3a52" }}>
          Only applies if you are a member of the firm. Leave blank for personal cases.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(124,110,247,0.05)", border: "1px solid rgba(124,110,247,0.12)" }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#7c6ef7" }}>Summary so far</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {[
            ["Title", form.title || "—"],
            ["Type", form.caseType || "—"],
            ["Priority", form.priority],
            ["Status", form.status],
            ["Court", form.court || "—"],
            ["Court Level", form.courtLevel || "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span style={{ color: "#4a4a62" }}>{k}</span>
              <span className="font-medium" style={{ color: "#a1a1aa" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
