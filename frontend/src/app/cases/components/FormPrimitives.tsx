"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";

// ─── shared style tokens ──────────────────────────────
const base = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(40,50,80,1)",
  borderRadius: "12px",
  color: "#e2e8f0",
  fontSize: "14px",
  outline: "none",
  transition: "border-color .18s, box-shadow .18s",
  width: "100%",
  padding: "10px 14px",
};
const focusOn  = (el: HTMLElement) => { el.style.borderColor="rgba(212,175,55,0.55)"; el.style.boxShadow="0 0 0 3px rgba(212,175,55,0.09)"; };
const focusOff = (el: HTMLElement) => { el.style.borderColor="rgba(40,50,80,1)"; el.style.boxShadow="none"; };

// ─── FormField ──────────────────────────────────────
export function FormField({ label, required, error, children, hint }: {
  label?: string; required?: boolean; error?: string; children: ReactNode; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: error ? "#f87171" : "#505070" }}>
            {label}{required && <span className="ml-1" style={{ color:"#f87171" }}>*</span>}
          </label>
          {hint && <span className="text-[10px]" style={{ color:"#383858" }}>{hint}</span>}
        </div>
      )}
      {children}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="text-[11px] flex items-center gap-1" style={{ color:"#f87171" }}>
            ↑ {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── TextInput ──────────────────────────────────────
export function TextInput({ value, onChange, placeholder, error, type = "text" }: {
  value: string; onChange: (v:string)=>void; placeholder?: string; error?: boolean; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="placeholder-[#252535]"
      style={{ ...base, borderColor: error ? "rgba(248,113,113,0.5)" : "rgba(40,50,80,1)" }}
      onFocus={e => focusOn(e.currentTarget)}
      onBlur={e  => { if (!error) focusOff(e.currentTarget); }}
    />
  );
}

// ─── TextArea ──────────────────────────────────────
export function TextArea({ value, onChange, placeholder, rows=3, error }: {
  value: string; onChange:(v:string)=>void; placeholder?:string; rows?:number; error?:boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="resize-none placeholder-[#252535]"
      style={{ ...base, borderColor: error ? "rgba(248,113,113,0.5)" : "rgba(40,50,80,1)" }}
      onFocus={e => focusOn(e.currentTarget as any)}
      onBlur={e  => { if (!error) focusOff(e.currentTarget as any); }}
    />
  );
}

// ─── SelectInput ──────────────────────────────────
export function SelectInput({ value, onChange, options, placeholder }: {
  value: string; onChange:(v:string)=>void; options:{value:string;label:string}[]; placeholder?:string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...base, appearance:"none", paddingRight:"36px", colorScheme:"dark",
          color: value ? "#e2e8f0" : "#252535" }}
        onFocus={e => focusOn(e.currentTarget as any)}
        onBlur={e  => focusOff(e.currentTarget as any)}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color:"#404060" }}/>
    </div>
  );
}

// ─── TagInput ──────────────────────────────────────
export function TagInput({ tags, onChange, placeholder }: {
  tags:string[]; onChange:(t:string[])=>void; placeholder?:string;
}) {
  const remove = (i:number) => onChange(tags.filter((_,j)=>j!==i));
  return (
    <div className="rounded-xl p-2.5 flex flex-wrap gap-2 min-h-[46px]"
      style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(40,50,80,1)" }}
      onClick={e => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}>
      {tags.map((t,i) => (
        <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
          style={{ background:"rgba(212,175,55,0.1)", color:"#c9a227", border:"1px solid rgba(212,175,55,0.2)" }}>
          {t}
          <button type="button" onClick={()=>remove(i)}
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <X size={9}/>
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[80px] bg-transparent text-xs text-white outline-none placeholder-[#252535]"
        placeholder={tags.length === 0 ? placeholder : "+ add"}
        onKeyDown={e => {
          if ((e.key === "Enter" || e.key === ",") && (e.target as HTMLInputElement).value.trim()) {
            e.preventDefault();
            const v = (e.target as HTMLInputElement).value.trim().replace(/,$/, "");
            if (v && !tags.includes(v)) onChange([...tags, v]);
            (e.target as HTMLInputElement).value = "";
          }
          if (e.key === "Backspace" && !(e.target as HTMLInputElement).value && tags.length)
            remove(tags.length - 1);
        }}
      />
    </div>
  );
}
