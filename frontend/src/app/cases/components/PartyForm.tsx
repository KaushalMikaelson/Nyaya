"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PartyData } from "../hooks/useCaseForm";
import { FormField, TextInput, SelectInput } from "./FormPrimitives";

const GENDERS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Chandigarh","Jammu & Kashmir","Ladakh",
].map((s) => ({ value: s, label: s }));

type Props = {
  party: PartyData;
  onChange: (field: keyof PartyData, value: string | boolean) => void;
  errors?: Record<string, string>;
  errorPrefix?: string;
  /** If true the card starts collapsed (used for extra parties) */
  collapsible?: boolean;
  label?: string;
};

export function PartyForm({ party, onChange, errors = {}, errorPrefix = "", collapsible = false, label }: Props) {
  const [collapsed, setCollapsed] = useState(collapsible);
  const [aadhaarFocused, setAadhaarFocused] = useState(false);

  const e = (k: string) => errors[`${errorPrefix}${k}`];

  const displayAadhaar = () => {
    if (aadhaarFocused) return party.aadhaarRaw;
    if (!party.aadhaarRaw) return "";
    const d = party.aadhaarRaw.replace(/\D/g, "");
    if (d.length < 4) return party.aadhaarRaw;
    return `XXXX XXXX ${d.slice(-4)}`;
  };

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(30,38,66,1)", background: "rgba(255,255,255,0.02)" }}>
      {/* Header (clickable if collapsible) */}
      {collapsible ? (
        <button type="button" onClick={() => setCollapsed((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          style={{ borderBottom: collapsed ? "none" : "1px solid rgba(30,38,66,1)" }}>
          <span className="text-sm font-semibold text-white">{label || party.partyType}</span>
          {collapsed ? <ChevronDown size={15} style={{ color: "#4a4a62" }} /> : <ChevronUp size={15} style={{ color: "#4a4a62" }} />}
        </button>
      ) : label ? (
        <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(30,38,66,1)" }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#7c6ef7" }}>{label}</p>
        </div>
      ) : null}

      {/* Body */}
      {!collapsed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-4">

          {/* Name + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Full Name" required error={e("fullName")}>
              <TextInput value={party.fullName} onChange={(v) => onChange("fullName", v)}
                placeholder="As per records" error={!!e("fullName")} />
            </FormField>
            <FormField label="Gender">
              <SelectInput value={party.gender} onChange={(v) => onChange("gender", v)}
                options={GENDERS} placeholder="Select" />
            </FormField>
          </div>

          {/* DOB + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date of Birth">
              <input type="date" value={party.dateOfBirth}
                onChange={(e) => onChange("dateOfBirth", e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", colorScheme: "dark" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.45)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(30,38,66,1)"; }} />
            </FormField>
            <FormField label="Mobile Number" error={e("phone")}>
              <TextInput value={party.phone} onChange={(v) => onChange("phone", v)}
                placeholder="10-digit mobile" error={!!e("phone")} />
            </FormField>
          </div>

          {/* Email */}
          <FormField label="Email Address" error={e("email")}>
            <TextInput value={party.email} onChange={(v) => onChange("email", v)}
              placeholder="email@example.com" error={!!e("email")} />
          </FormField>

          {/* Address */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4a4a62" }}>Address</p>
            <TextInput value={party.addressLine1} onChange={(v) => onChange("addressLine1", v)}
              placeholder="House / Flat / Building No." />
            <TextInput value={party.addressLine2} onChange={(v) => onChange("addressLine2", v)}
              placeholder="Street / Area / Locality" />
            <div className="grid grid-cols-3 gap-3">
              <FormField label="City">
                <TextInput value={party.city} onChange={(v) => onChange("city", v)} placeholder="City" />
              </FormField>
              <FormField label="State">
                <SelectInput value={party.state} onChange={(v) => onChange("state", v)}
                  options={INDIAN_STATES} placeholder="State" />
              </FormField>
              <FormField label="Pincode" error={e("pincode")}>
                <TextInput value={party.pincode} onChange={(v) => onChange("pincode", v)}
                  placeholder="6 digits" error={!!e("pincode")} />
              </FormField>
            </div>
          </div>

          {/* Aadhaar — optional, masked */}
          <div className="rounded-xl p-3 space-y-2"
            style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8a7a42" }}>
              Aadhaar (Optional — only last 4 digits stored)
            </p>
            <input
              type={aadhaarFocused ? "tel" : "text"}
              value={displayAadhaar()}
              onFocus={() => setAadhaarFocused(true)}
              onBlur={() => setAadhaarFocused(false)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                onChange("aadhaarRaw", digits);
              }}
              placeholder="12-digit Aadhaar number"
              maxLength={12}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all placeholder-[#3a3a52]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.18)" }}
            />
            {party.aadhaarRaw.length > 0 && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={party.aadhaarConsent}
                  onChange={(e) => onChange("aadhaarConsent", e.target.checked)}
                  className="mt-0.5 accent-yellow-500" />
                <span className="text-xs leading-relaxed" style={{ color: "#6a6a82" }}>
                  I consent to Nyaya storing a masked version of this Aadhaar number for identity verification purposes, as per the DPDP Act 2023.
                </span>
              </label>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
