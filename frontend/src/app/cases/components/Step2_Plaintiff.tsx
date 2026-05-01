"use client";

import { motion } from "framer-motion";
import { CaseFormData, PartyData } from "../hooks/useCaseForm";
import { PartyForm } from "./PartyForm";

type Props = {
  form: CaseFormData;
  errors: Record<string, string>;
  setPartyField: (role: "plaintiff" | "defendant", field: keyof PartyData, value: string | boolean) => void;
};

export function Step2_Plaintiff({ form, errors, setPartyField }: Props) {
  return (
    <motion.div key="step2" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }} className="space-y-5">

      <div className="rounded-2xl p-3.5"
        style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
        <p className="text-xs leading-relaxed" style={{ color: "#6a8fcf" }}>
          <span className="font-bold">Plaintiff / Petitioner</span> — the party who files or initiates the case. Enter their personal details as they appear on official documents.
        </p>
      </div>

      <PartyForm
        party={form.plaintiff}
        onChange={(field, value) => setPartyField("plaintiff", field, value)}
        errors={errors}
        errorPrefix="plaintiff."
        label="Plaintiff / Petitioner Details"
      />
    </motion.div>
  );
}
