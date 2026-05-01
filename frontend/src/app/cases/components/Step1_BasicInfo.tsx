"use client";

import { motion } from "framer-motion";
import { Scale, Shield, Users, Brain, FileText, Landmark, Gavel, ShoppingCart } from "lucide-react";
import { CaseFormData } from "../hooks/useCaseForm";
import { FormField, TextInput, SelectInput, TagInput } from "./FormPrimitives";

const CASE_TYPES = [
  { value: "CIVIL", label: "⚖️  Civil", icon: Scale },
  { value: "CRIMINAL", label: "🔒  Criminal", icon: Shield },
  { value: "FAMILY", label: "👨‍👩‍👧  Family", icon: Users },
  { value: "CONSTITUTIONAL", label: "📜  Constitutional", icon: FileText },
  { value: "LABOUR", label: "🏭  Labour", icon: Landmark },
  { value: "CONSUMER", label: "🛒  Consumer", icon: ShoppingCart },
  { value: "TAX", label: "🏛️  Tax", icon: Landmark },
  { value: "IP", label: "💡  Intellectual Property", icon: Brain },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "🟢  Low" },
  { value: "MEDIUM", label: "🟡  Medium" },
  { value: "HIGH", label: "🟠  High" },
  { value: "URGENT", label: "🔴  Urgent" },
];

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "CLOSED", label: "Closed" },
  { value: "APPEALED", label: "Appealed" },
];

const COURT_LEVELS = [
  { value: "DISTRICT", label: "District Court" },
  { value: "HIGH_COURT", label: "High Court" },
  { value: "SUPREME_COURT", label: "Supreme Court of India" },
  { value: "TRIBUNAL", label: "Tribunal / Special Court" },
];

const BENCH_TYPES = [
  { value: "SINGLE", label: "Single Bench" },
  { value: "DIVISION", label: "Division Bench" },
  { value: "FULL", label: "Full Bench" },
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Chandigarh","J&K","Ladakh",
].map((s) => ({ value: s, label: s }));

type Props = {
  form: CaseFormData;
  errors: Partial<Record<keyof CaseFormData, string>>;
  setField: <K extends keyof CaseFormData>(key: K, value: CaseFormData[K]) => void;
};

export function Step1_BasicInfo({ form, errors, setField }: Props) {
  return (
    <motion.div key="step1" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }} className="space-y-5">

      <FormField label="Case Title" required error={errors.title}>
        <TextInput
          value={form.title}
          onChange={(v) => setField("title", v)}
          placeholder="e.g. State of Maharashtra v. Ramesh Kumar"
          error={!!errors.title}
        />
      </FormField>

      <FormField label="Case Type" required error={errors.caseType}>
        <div className="grid grid-cols-2 gap-2">
          {CASE_TYPES.map((ct) => (
            <button
              key={ct.value}
              type="button"
              onClick={() => setField("caseType", ct.value)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all"
              style={{
                background: form.caseType === ct.value ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${form.caseType === ct.value ? "rgba(212,175,55,0.35)" : "rgba(30,38,66,1)"}`,
                color: form.caseType === ct.value ? "#d4af37" : "#6a6a82",
              }}
            >
              <span>{ct.label}</span>
            </button>
          ))}
        </div>
        {errors.caseType && (
          <p className="text-xs mt-1" style={{ color: "#f87171" }}>{errors.caseType}</p>
        )}
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Priority">
          <SelectInput
            value={form.priority}
            onChange={(v) => setField("priority", v)}
            options={PRIORITY_OPTIONS}
          />
        </FormField>
        <FormField label="Status">
          <SelectInput
            value={form.status}
            onChange={(v) => setField("status", v)}
            options={STATUS_OPTIONS}
          />
        </FormField>
      </div>

      <div className="pt-1 border-t" style={{ borderColor: "rgba(30,38,66,1)" }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-3 mt-3" style={{ color: "#4a4a62" }}>
          Court &amp; Jurisdiction
        </p>
        <div className="space-y-4">
          <FormField label="Case Number">
            <TextInput
              value={form.caseNumber}
              onChange={(v) => setField("caseNumber", v)}
              placeholder="Auto-generated if left blank"
            />
          </FormField>
          <FormField label="Court Name">
            <TextInput
              value={form.court}
              onChange={(v) => setField("court", v)}
              placeholder="e.g. Bombay High Court"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Court Level">
              <SelectInput
                value={form.courtLevel}
                onChange={(v) => setField("courtLevel", v)}
                options={COURT_LEVELS}
                placeholder="Select level"
              />
            </FormField>
            <FormField label="State">
              <SelectInput
                value={form.courtState}
                onChange={(v) => setField("courtState", v)}
                options={INDIAN_STATES}
                placeholder="Select state"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Bench Type">
              <SelectInput
                value={form.benchType}
                onChange={(v) => setField("benchType", v)}
                options={BENCH_TYPES}
                placeholder="Select bench"
              />
            </FormField>
            <FormField label="Judge Name">
              <TextInput
                value={form.judgeName}
                onChange={(v) => setField("judgeName", v)}
                placeholder="Hon. Justice..."
              />
            </FormField>
          </div>
        </div>
      </div>

      <FormField label="Description">
        <textarea
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="Brief description of the matter..."
          rows={3}
          className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all resize-none placeholder-[#3a3a52]"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.07)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(30,38,66,1)"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </FormField>

      <FormField label="Tags">
        <TagInput
          tags={form.tags}
          onChange={(v) => setField("tags", v)}
          placeholder="bail, injunction, contempt..."
        />
      </FormField>
    </motion.div>
  );
}
