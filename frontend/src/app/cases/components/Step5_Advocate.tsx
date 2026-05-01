"use client";

import { motion } from "framer-motion";
import { Scale } from "lucide-react";
import { CaseFormData, AdvocateData } from "../hooks/useCaseForm";
import { FormField, TextInput, SelectInput } from "./FormPrimitives";

const BAR_COUNCIL_STATES = [
  "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Gujarat","Himachal Pradesh",
  "Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra & Goa","Manipur",
  "Orissa","Punjab & Haryana","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand",
].map((s) => ({ value: s, label: `${s} Bar Council` }));

const REPRESENTS = [
  { value: "PLAINTIFF", label: "Plaintiff / Petitioner" },
  { value: "DEFENDANT", label: "Defendant / Respondent" },
  { value: "BOTH", label: "Both Parties" },
];

type Props = {
  form: CaseFormData;
  errors: Record<string, string>;
  setAdvocateField: (field: keyof AdvocateData, value: string) => void;
};

export function Step5_Advocate({ form, errors, setAdvocateField }: Props) {
  const adv = form.advocate;

  return (
    <motion.div key="step5" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }} className="space-y-5">

      {/* Header card */}
      <div className="rounded-2xl p-3.5 flex items-start gap-3"
        style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.15)" }}>
        <Scale size={16} style={{ color: "#d4af37", marginTop: 2, flexShrink: 0 }} />
        <p className="text-xs leading-relaxed" style={{ color: "#a08b3a" }}>
          Enter the details of the <span className="font-bold">Advocate on Record</span>. This section is optional — leave blank if no advocate has been appointed yet.
        </p>
      </div>

      {/* Advocate details */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(30,38,66,1)", background: "rgba(255,255,255,0.02)" }}>
        <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(30,38,66,1)" }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#d4af37" }}>Advocate Details</p>
        </div>

        <div className="p-4 space-y-4">
          <FormField label="Full Name (as per Bar enrollment)">
            <TextInput value={adv.fullName} onChange={(v) => setAdvocateField("fullName", v)}
              placeholder="Advocate's full name" />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Bar Enrollment No.">
              <TextInput value={adv.enrollmentNo} onChange={(v) => setAdvocateField("enrollmentNo", v)}
                placeholder="e.g. MH/1234/2018" />
            </FormField>
            <FormField label="Bar Council State">
              <SelectInput value={adv.barCouncilState}
                onChange={(v) => setAdvocateField("barCouncilState", v)}
                options={BAR_COUNCIL_STATES} placeholder="Select Bar Council" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Mobile Number">
              <TextInput value={adv.phone} onChange={(v) => setAdvocateField("phone", v)}
                placeholder="10-digit mobile" />
            </FormField>
            <FormField label="Email Address">
              <TextInput value={adv.email} onChange={(v) => setAdvocateField("email", v)}
                placeholder="advocate@email.com" />
            </FormField>
          </div>

          <FormField label="Represents">
            <SelectInput value={adv.represents} onChange={(v) => setAdvocateField("represents", v)}
              options={REPRESENTS} />
          </FormField>
        </div>
      </div>

      {/* Enrollment format hint */}
      <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(30,38,66,1)" }}>
        <p className="text-xs font-bold mb-2" style={{ color: "#4a4a62" }}>Enrollment Number Format</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs" style={{ color: "#3a3a52" }}>
          {[["Maharashtra", "MH/XXXX/YYYY"], ["Delhi", "D/XXXX/YYYY"], ["Karnataka", "KAR/XXXX/YYYY"], ["Tamil Nadu", "TN/XXXX/YYYY"]].map(([state, fmt]) => (
            <div key={state} className="flex justify-between">
              <span style={{ color: "#4a4a62" }}>{state}</span>
              <span className="font-mono">{fmt}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
