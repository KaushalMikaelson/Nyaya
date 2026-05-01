"use client";

import { motion } from "framer-motion";
import { Scale, Shield, Users, FileText, Landmark, ShoppingCart, Brain, Gavel } from "lucide-react";
import { CaseFormData } from "../hooks/useCaseForm";
import { FormField, TextInput, SelectInput, TagInput, TextArea } from "./FormPrimitives";

// ─── Case type config ────────────────────────────────────────────────────
const CASE_TYPES = [
  { value:"CIVIL",          label:"Civil",          sub:"Property / Contract",    Icon:Scale,       accent:"#60a5fa" },
  { value:"CRIMINAL",       label:"Criminal",       sub:"FIR / Bail / Trial",     Icon:Shield,      accent:"#f87171" },
  { value:"FAMILY",         label:"Family",         sub:"Divorce / Custody",      Icon:Users,       accent:"#f472b6" },
  { value:"CONSTITUTIONAL", label:"Constitutional", sub:"Article 226 / 32",       Icon:FileText,    accent:"#a78bfa" },
  { value:"LABOUR",         label:"Labour",         sub:"Disputes / Termination", Icon:Landmark,    accent:"#fb923c" },
  { value:"CONSUMER",       label:"Consumer",       sub:"CDRC / Forum",           Icon:ShoppingCart,accent:"#34d399" },
  { value:"TAX",            label:"Tax",            sub:"GST / IT / Customs",     Icon:Gavel,       accent:"#facc15" },
  { value:"IP",             label:"IP / Trademark", sub:"Copyright / Patent",     Icon:Brain,       accent:"#c084fc" },
];

const PRIORITY_OPTIONS = [
  { value:"LOW",    label:"🟢  Low"    },
  { value:"MEDIUM", label:"🟡  Medium" },
  { value:"HIGH",   label:"🟠  High"   },
  { value:"URGENT", label:"🔴  Urgent" },
];
const STATUS_OPTIONS = [
  { value:"OPEN",        label:"Open"        },
  { value:"IN_PROGRESS", label:"In Progress" },
  { value:"ON_HOLD",     label:"On Hold"     },
  { value:"CLOSED",      label:"Closed"      },
  { value:"APPEALED",    label:"Appealed"    },
];
const COURT_LEVELS = [
  { value:"DISTRICT",      label:"District Court"          },
  { value:"HIGH_COURT",    label:"High Court"              },
  { value:"SUPREME_COURT", label:"Supreme Court of India"  },
  { value:"TRIBUNAL",      label:"Tribunal / Special Court"},
];
const BENCH_TYPES = [
  { value:"SINGLE",   label:"Single Bench"   },
  { value:"DIVISION", label:"Division Bench" },
  { value:"FULL",     label:"Full Bench"     },
];
const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Chandigarh","Jammu & Kashmir","Ladakh",
].map(s=>({ value:s, label:s }));

// ─── Section divider ────────────────────────────────────────────────────
function Section({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="h-px flex-1" style={{ background:"rgba(40,50,80,0.8)" }}/>
      <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color:"#404060" }}>{title}</span>
      <div className="h-px flex-1" style={{ background:"rgba(40,50,80,0.8)" }}/>
    </div>
  );
}

function DateField({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  return (
    <input type="date" value={value} onChange={e=>onChange(e.target.value)}
      className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all"
      style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(40,50,80,1)", colorScheme:"dark" }}
      onFocus={e=>{ e.currentTarget.style.borderColor="rgba(212,175,55,0.55)"; e.currentTarget.style.boxShadow="0 0 0 3px rgba(212,175,55,0.09)"; }}
      onBlur={e=>{ e.currentTarget.style.borderColor="rgba(40,50,80,1)"; e.currentTarget.style.boxShadow="none"; }}/>
  );
}

type Props = {
  form: CaseFormData;
  errors: Record<string,string>;
  setField: <K extends keyof CaseFormData>(key:K, value:CaseFormData[K])=>void;
};

export function Step1_BasicInfo({ form, errors, setField }: Props) {
  const isCriminal = form.caseType === "CRIMINAL";
  const sel = CASE_TYPES.find(c=>c.value===form.caseType);

  return (
    <motion.div key="step1" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:-8 }} className="space-y-5">

      {/* Case Title */}
      <FormField label="Case Title" required error={errors["title"]}>
        <TextInput value={form.title} onChange={v=>setField("title",v)}
          placeholder="e.g. State of Maharashtra v. Ramesh Kumar" error={!!errors["title"]}/>
      </FormField>

      {/* Case Type — premium visual grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: errors["caseType"] ? "#f87171" : "#505070" }}>
            Case Type <span style={{ color:"#f87171" }}>*</span>
          </label>
          {sel && (
            <motion.span initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background:`${sel.accent}15`, color:sel.accent, border:`1px solid ${sel.accent}30` }}>
              <sel.Icon size={10}/> {sel.label}
            </motion.span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CASE_TYPES.map(ct => {
            const active = form.caseType === ct.value;
            return (
              <motion.button key={ct.value} type="button" onClick={()=>setField("caseType",ct.value)}
                whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                className="relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-left overflow-hidden transition-all"
                style={{
                  background: active ? `${ct.accent}10` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? ct.accent+"45" : "rgba(40,50,80,0.9)"}`,
                  boxShadow: active ? `0 0 18px ${ct.accent}15` : "none",
                }}>
                {/* Glow bg */}
                {active && (
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background:`radial-gradient(circle at 0% 50%, ${ct.accent}08, transparent 60%)` }}/>
                )}
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background:`${ct.accent}15`, border:`1px solid ${ct.accent}25`, color:ct.accent }}>
                  <ct.Icon size={14}/>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-none mb-0.5"
                    style={{ color: active ? "#e2e8f0" : "#6a6a8a" }}>{ct.label}</p>
                  <p className="text-[10px] leading-none" style={{ color: active ? ct.accent : "#303050" }}>{ct.sub}</p>
                </div>
                {active && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background:`${ct.accent}20`, border:`1px solid ${ct.accent}40` }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background:ct.accent }}/>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
        {errors["caseType"] && <p className="text-[11px] mt-1.5" style={{ color:"#f87171" }}>↑ {errors["caseType"]}</p>}
      </div>

      {/* Priority + Status */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Priority">
          <SelectInput value={form.priority} onChange={v=>setField("priority",v)} options={PRIORITY_OPTIONS}/>
        </FormField>
        <FormField label="Status">
          <SelectInput value={form.status} onChange={v=>setField("status",v)} options={STATUS_OPTIONS}/>
        </FormField>
      </div>

      <Section title="Legal Details"/>

      {/* Act / Section */}
      <FormField label="Act / Section" hint="Separate multiple with commas">
        <TextInput value={form.actSection} onChange={v=>setField("actSection",v)}
          placeholder="IPC 420, CrPC 482, Article 226…"/>
      </FormField>

      {/* FIR + PS */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label={isCriminal ? "FIR Number ⚠" : "FIR Number"}>
          <TextInput value={form.firNumber} onChange={v=>setField("firNumber",v)}
            placeholder="FIR No."/>
        </FormField>
        <FormField label="Police Station">
          <TextInput value={form.policeStation} onChange={v=>setField("policeStation",v)}
            placeholder="Jurisdictional PS"/>
        </FormField>
      </div>

      {/* Court fee */}
      <FormField label="Court Fee Paid (₹)">
        <TextInput value={form.courtFeeAmount} onChange={v=>setField("courtFeeAmount",v)} placeholder="₹ 0.00"/>
      </FormField>

      <Section title="Court & Jurisdiction"/>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Case / CNR Number">
          <TextInput value={form.caseNumber} onChange={v=>setField("caseNumber",v)} placeholder="Auto-generated"/>
        </FormField>
        <FormField label="Judge Name">
          <TextInput value={form.judgeName} onChange={v=>setField("judgeName",v)} placeholder="Hon. Justice…"/>
        </FormField>
      </div>
      <FormField label="Court Name">
        <TextInput value={form.court} onChange={v=>setField("court",v)} placeholder="e.g. Bombay High Court"/>
      </FormField>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Level">
          <SelectInput value={form.courtLevel} onChange={v=>setField("courtLevel",v)} options={COURT_LEVELS} placeholder="Level"/>
        </FormField>
        <FormField label="State">
          <SelectInput value={form.courtState} onChange={v=>setField("courtState",v)} options={INDIAN_STATES} placeholder="State"/>
        </FormField>
        <FormField label="Bench">
          <SelectInput value={form.benchType} onChange={v=>setField("benchType",v)} options={BENCH_TYPES} placeholder="Bench"/>
        </FormField>
      </div>

      <Section title="Key Dates"/>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Date of Filing"><DateField value={form.filedAt} onChange={v=>setField("filedAt",v)}/></FormField>
        <FormField label="Limitation Deadline"><DateField value={form.limitationDate} onChange={v=>setField("limitationDate",v)}/></FormField>
      </div>

      {/* Limitation warning */}
      {form.limitationDate && new Date(form.limitationDate) < new Date(Date.now()+30*86400000) && (
        <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
          className="flex items-center gap-3 rounded-xl p-3.5"
          style={{ background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.2)" }}>
          <span className="text-base">⏰</span>
          <p className="text-xs" style={{ color:"#f87171" }}>
            Limitation deadline is <strong>within 30 days</strong> — take immediate action.
          </p>
        </motion.div>
      )}

      <Section title="Additional"/>

      <FormField label="Brief Description">
        <TextArea value={form.description} onChange={v=>setField("description",v)}
          placeholder="Short description of the matter…" rows={3}/>
      </FormField>
      <FormField label="Tags" hint="Press Enter to add">
        <TagInput tags={form.tags} onChange={v=>setField("tags",v)} placeholder="bail, injunction, contempt…"/>
      </FormField>
    </motion.div>
  );
}
