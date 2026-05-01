"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Users } from "lucide-react";
import { CaseFormData, PartyData } from "../hooks/useCaseForm";
import { PartyForm } from "./PartyForm";
import { SelectInput, FormField } from "./FormPrimitives";

const EXTRA_PARTY_TYPES = [
  { value: "WITNESS", label: "Witness" },
  { value: "INTERVENER", label: "Intervener" },
  { value: "CO_PETITIONER", label: "Co-Petitioner" },
  { value: "CO_DEFENDANT", label: "Co-Defendant" },
  { value: "OTHER", label: "Other" },
];

type Props = {
  form: CaseFormData;
  errors: Record<string, string>;
  addExtraParty: () => void;
  removeExtraParty: (idx: number) => void;
  setExtraPartyField: (idx: number, field: keyof PartyData, value: string | boolean) => void;
};

export function Step4_ExtraParties({ form, addExtraParty, removeExtraParty, setExtraPartyField, errors }: Props) {
  return (
    <motion.div key="step4" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }} className="space-y-4">

      {/* Explainer */}
      <div className="rounded-2xl p-3.5"
        style={{ background: "rgba(124,110,247,0.05)", border: "1px solid rgba(124,110,247,0.15)" }}>
        <p className="text-xs leading-relaxed" style={{ color: "#9d8fff" }}>
          Add any additional parties to this case — witnesses, co-petitioners, interveners, or other respondents.
          This section is <span className="font-bold">optional</span>; skip if not applicable.
        </p>
      </div>

      {/* Empty state */}
      {form.extraParties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 rounded-2xl"
          style={{ border: "2px dashed rgba(30,38,66,1)" }}>
          <Users size={28} className="mb-3" style={{ color: "#3a3a52" }} />
          <p className="text-sm mb-1" style={{ color: "#4a4a62" }}>No extra parties added yet</p>
          <p className="text-xs mb-4 text-center max-w-xs" style={{ color: "#3a3a52" }}>
            Add witnesses, co-petitioners, interveners or other parties involved in this matter.
          </p>
        </div>
      )}

      {/* Party cards */}
      <AnimatePresence>
        {form.extraParties.map((party, idx) => (
          <motion.div key={idx}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }} className="space-y-3">

            {/* Role selector + remove button */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <FormField label={`Party ${idx + 1} — Role`}>
                  <SelectInput
                    value={party.partyType}
                    onChange={(v) => setExtraPartyField(idx, "partyType", v)}
                    options={EXTRA_PARTY_TYPES}
                    placeholder="Select role"
                  />
                </FormField>
              </div>
              <button type="button" onClick={() => removeExtraParty(idx)}
                className="mt-5 w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}>
                <Trash2 size={14} />
              </button>
            </div>

            <PartyForm
              party={party}
              onChange={(field, value) => setExtraPartyField(idx, field, value)}
              errors={errors}
              errorPrefix={`extra.${idx}.`}
              collapsible
              label={`${party.partyType || "Extra Party"} — ${party.fullName || "Unnamed"}`}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add button */}
      <motion.button
        type="button"
        onClick={addExtraParty}
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: "rgba(124,110,247,0.06)", border: "1px dashed rgba(124,110,247,0.3)",
          color: "#9d8fff",
        }}>
        <Plus size={15} /> Add Extra Party
      </motion.button>
    </motion.div>
  );
}
