"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

const inputBase =
  "w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all placeholder-[#3a3a52]";
const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(30,38,66,1)",
};
const focusStyle = { borderColor: "rgba(212,175,55,0.45)", boxShadow: "0 0 0 3px rgba(212,175,55,0.07)" };
const blurStyle = { borderColor: "rgba(30,38,66,1)", boxShadow: "none" };

export function FormField({
  label, error, required, children,
}: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "#4a4a62" }}>
        {label}{required && <span style={{ color: "#f87171" }}> *</span>}
      </label>
      {children}
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs" style={{ color: "#f87171" }}>
          <AlertCircle size={11} />{error}
        </motion.p>
      )}
    </div>
  );
}

export function TextInput({
  value, onChange, placeholder = "", error, disabled,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; error?: boolean; disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={inputBase}
      style={{ ...inputStyle, borderColor: error ? "rgba(248,113,113,0.5)" : undefined, opacity: disabled ? 0.5 : 1 }}
      onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
      onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
    />
  );
}

export function TextArea({
  value, onChange, placeholder = "", rows = 3, error,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; error?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${inputBase} resize-none`}
      style={{ ...inputStyle, borderColor: error ? "rgba(248,113,113,0.5)" : undefined }}
      onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
      onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
    />
  );
}

export function SelectInput({
  value, onChange, options, placeholder = "Select...", error,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputBase}
      style={{
        ...inputStyle,
        borderColor: error ? "rgba(248,113,113,0.5)" : undefined,
        color: value ? "#ededed" : "#3a3a52",
      }}
      onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
      onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
    >
      <option value="" disabled style={{ background: "#0d1224" }}>{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: "#0d1224", color: "#ededed" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function TagInput({
  tags, onChange, placeholder = "Type and press Enter...",
}: {
  tags: string[]; onChange: (tags: string[]) => void; placeholder?: string;
}) {
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val && !tags.includes(val)) {
        onChange([...tags, val]);
        e.currentTarget.value = "";
      }
    }
  };
  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag));

  return (
    <div className="rounded-xl p-2 min-h-[42px] flex flex-wrap gap-1.5 items-center"
      style={{ ...inputStyle }}>
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium"
          style={{ background: "rgba(212,175,55,0.12)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.2)" }}>
          {t}
          <button type="button" onClick={() => remove(t)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
        </span>
      ))}
      <input
        type="text"
        onKeyDown={handleKey}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-white outline-none placeholder-[#3a3a52]"
      />
    </div>
  );
}
