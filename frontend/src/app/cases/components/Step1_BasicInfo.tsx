"use client";

import { motion } from "framer-motion";
import { CaseFormData } from "../hooks/useCaseForm";
import { FormField, TextInput, SelectInput, TagInput } from "./FormPrimitives";

const CASE_TYPES = [
  { value: "CIVIL",          label: "⚖️  Civil" },
  { value: "CRIMINAL",       label: "🔒  Criminal" },
  { value: "FAMILY",         label: "👨‍👩‍👧  Family" },
  { value: "CONSTITUTIONAL", label: "📜  Constitutional" },
  { value: "LABOUR",         label: "🏭  Labour" },
  { value: "CONSUMER",       label: "🛒  Consumer" },
  { value: "TAX",            label: "🏛️  Tax" },
  { value: "IP",             label: "💡  IP / Trademark" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW",    label: "🟢  Low" },
  { value: "MEDIUM", label: "🟡  Medium" },
  { value: "HIGH",   label: "🟠  High" },
  { value: "URGENT", label: "🔴  Urgent" },
];

const STATUS_OPTIONS = [
  { value: "OPEN",        label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ON_HOLD",     label: "On Hold" },
  { value: "CLOSED",      label: "Closed" },
  { value: "APPEALED",    label: "Appealed" },
];

const COURT_LEVELS = [
  { value: "DISTRICT",      label: "District Court" },
  { value: "HIGH_COURT",    label: "High Court" },
  { value: "SUPREME_COURT", label: "Supreme Court of India" },
  { value: "TRIBUNAL",      label: "Tribunal / Special Court" },
];

const BENCH_TYPES = [
  { value: "SINGLE",   label: "Single Bench" },
  { value: "DIVISION", label: "Division Bench" },
  { value: "FULL",     label: "Full Bench" },
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Chandigarh","Jammu & Kashmir","Ladakh",
].map((s) => ({ value: s, label: s }));

const dateInput = (value: string, onChange: (v: string) => void) => (
  <input
    type="date"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all"
    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", colorScheme: "dark" }}
    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.07)"; }}
    onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(30,38,66,1)"; e.currentTarget.style.boxShadow = "none"; }}
  />
);

type Props = {
  form: CaseFormData;
  errors: Record<string, string>;
  setField: <K extends keyof CaseFormData>(key: K, value: CaseFormData[K]) => void;
};

export function Step1_BasicInfo({ form, errors, setField }: Props) {
  const isCriminal = form.caseType === "CRIMINAL";

  return (
    <motion.div key="step1" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }} className="space-y-5">

      {/* Case Title */}
      <FormField label="Case Title" required error={errors["title"]}>
        <TextInput value={form.title} onChange={(v) => setField("title", v)}
          placeholder="e.g. State of Maharashtra v. Ramesh Kumar" error={!!errors["title"]} />
      </FormField>

      {/* Case Type grid */}
      <FormField label="Case Type" required error={errors["caseType"]}>
        <div className="grid grid-cols-2 gap-2">
          {CASE_TYPES.map((ct) => (
            <button key={ct.value} type="button" onClick={() => setField("caseType", ct.value)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all"
              style={{
                background: form.caseType === ct.value ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${form.caseType === ct.value ? "rgba(212,175,55,0.35)" : "rgba(30,38,66,1)"}`,
                color: form.caseType === ct.value ? "#d4af37" : "#6a6a82",
              }}>
              {ct.label}
            </button>
          ))}
        </div>
        {errors["caseType"] && <p className="text-xs mt-1" style={{ color: "#f87171" }}>{errors["caseType"]}</p>}
      </FormField>

      {/* Priority + Status */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Priority">
          <SelectInput value={form.priority} onChange={(v) => setField("priority", v)} options={PRIORITY_OPTIONS} />
        </FormField>
        <FormField label="Status">
          <SelectInput value={form.status} onChange={(v) => setField("status", v)} options={STATUS_OPTIONS} />
        </FormField>
      </div>

      {/* ── Legal Details ── */}
      <div className="pt-1 border-t" style={{ borderColor: "rgba(30,38,66,1)" }}>
        <p className="text-xs font-bold uppercase tracking-widest mt-3 mb-3" style={{ color: "#4a4a62" }}>
          Legal Details
        </p>
        <div className="space-y-4">
          <FormField label="Act / Section">
            <TextInput value={form.actSection} onChange={(v) => setField("actSection", v)}
              placeholder="e.g. IPC 420, CrPC 482, Article 226" />
          </FormField>

          {/* FIR fields — prominent for criminal, subtle for others */}
          <div className={`grid gap-4 ${isCriminal ? "grid-cols-2" : "grid-cols-2"}`}>
            <FormField label={isCriminal ? "FIR Number ⚠️" : "FIR Number"}>
              <TextInput value={form.firNumber} onChange={(v) => setField("firNumber", v)}
                placeholder="FIR No. (criminal cases)" />
            </FormField>
            <FormField label="Police Station">
              <TextInput value={form.policeStation} onChange={(v) => setField("policeStation", v)}
                placeholder="Jurisdictional PS" />
            </FormField>
          </div>

          <FormField label="Court Fee Paid (₹)">
            <TextInput value={form.courtFeeAmount} onChange={(v) => setField("courtFeeAmount", v)}
              placeholder="Amount in ₹" />
          </FormField>
        </div>
      </div>

      {/* ── Court & Jurisdiction ── */}
      <div className="pt-1 border-t" style={{ borderColor: "rgba(30,38,66,1)" }}>
        <p className="text-xs font-bold uppercase tracking-widest mt-3 mb-3" style={{ color: "#4a4a62" }}>
          Court &amp; Jurisdiction
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Case Number (CNR)">
              <TextInput value={form.caseNumber} onChange={(v) => setField("caseNumber", v)}
                placeholder="Auto-generated if blank" />
            </FormField>
            <FormField label="Court Fee Amount (₹)" >
              <TextInput value={form.courtFeeAmount} onChange={(v) => setField("courtFeeAmount", v)}
                placeholder="₹" />
            </FormField>
          </div>
          <FormField label="Court Name">
            <TextInput value={form.court} onChange={(v) => setField("court", v)}
              placeholder="e.g. Bombay High Court" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Court Level">
              <SelectInput value={form.courtLevel} onChange={(v) => setField("courtLevel", v)}
                options={COURT_LEVELS} placeholder="Select level" />
            </FormField>
            <FormField label="State">
              <SelectInput value={form.courtState} onChange={(v) => setField("courtState", v)}
                options={INDIAN_STATES} placeholder="Select state" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Bench Type">
              <SelectInput value={form.benchType} onChange={(v) => setField("benchType", v)}
                options={BENCH_TYPES} placeholder="Bench type" />
            </FormField>
            <FormField label="Judge Name">
              <TextInput value={form.judgeName} onChange={(v) => setField("judgeName", v)}
                placeholder="Hon. Justice..." />
            </FormField>
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="pt-1 border-t" style={{ borderColor: "rgba(30,38,66,1)" }}>
        <p className="text-xs font-bold uppercase tracking-widest mt-3 mb-3" style={{ color: "#4a4a62" }}>
          Key Dates
        </p>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date of Filing">{dateInput(form.filedAt, (v) => setField("filedAt", v))}</FormField>
          <FormField label="Limitation Deadline">{dateInput(form.limitationDate, (v) => setField("limitationDate", v))}</FormField>
        </div>
        {form.limitationDate && new Date(form.limitationDate) < new Date(Date.now() + 30 * 86400000) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-3 rounded-xl p-3 text-xs"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
            ⚠️ Limitation deadline is within 30 days — take immediate action.
          </motion.div>
        )}
      </div>

      {/* Description + Tags */}
      <div className="pt-1 border-t" style={{ borderColor: "rgba(30,38,66,1)" }}>
        <p className="text-xs font-bold uppercase tracking-widest mt-3 mb-3" style={{ color: "#4a4a62" }}>
          Additional Info
        </p>
        <div className="space-y-4">
          <FormField label="Brief Description">
            <textarea value={form.description} onChange={(e) => setField("description", e.target.value)}
              placeholder="Short description of the matter..." rows={3}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all resize-none placeholder-[#3a3a52]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"; }}
              onBlur={(e) =>  { e.currentTarget.style.borderColor = "rgba(30,38,66,1)"; }} />
          </FormField>
          <FormField label="Tags">
            <TagInput tags={form.tags} onChange={(v) => setField("tags", v)}
              placeholder="bail, injunction, contempt..." />
          </FormField>
        </div>
      </div>
    </motion.div>
  );
}
