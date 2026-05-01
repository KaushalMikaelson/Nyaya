"use client";

import { motion } from "framer-motion";
import { CaseFormData, PartyData } from "../hooks/useCaseForm";
import { PartyForm } from "./PartyForm";

type Props = {
  form: CaseFormData;
  errors: Record<string, string>;
  setPartyField: (role: "plaintiff" | "defendant", field: keyof PartyData, value: string | boolean) => void;
};

export function Step3_Defendant({ form, errors, setPartyField }: Props) {
  return (
    <motion.div key="step3" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }} className="space-y-5">

      <div className="rounded-2xl p-3.5"
        style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
        <p className="text-xs leading-relaxed" style={{ color: "#c47a7a" }}>
          <span className="font-bold">Defendant / Respondent</span> — the party against whom the case is filed. Enter their personal details as they appear on official documents.
        </p>
      </div>

      <PartyForm
        party={form.defendant}
        onChange={(field, value) => setPartyField("defendant", field, value)}
        errors={errors}
        errorPrefix="defendant."
        label="Defendant / Respondent Details"
      />
    </motion.div>
  );
}
