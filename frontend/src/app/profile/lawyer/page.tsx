"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, ArrowRight, AlertCircle, CheckCircle2, Clock,
  Upload, FileText, Briefcase, User, Building2, X,
  Shield, BookOpen, Camera, ChevronDown, Loader2,
} from "lucide-react";
import Link from "next/link";

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function Input({
  id, label, type = "text", value, onChange, placeholder, icon: Icon, required, hint,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  icon?: React.ElementType; required?: boolean; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>{label}</label>
      <div className="relative">
        {Icon && (
          <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: focused || value ? "#8b5cf6" : "#4a4a62" }} />
        )}
        <input
          id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="w-full rounded-xl py-3 text-white placeholder-[#3a3a52] outline-none transition-all text-sm"
          style={{
            background: "#0e0e18",
            border: `1px solid ${focused ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.07)"}`,
            boxShadow: focused ? "0 0 0 3px rgba(139,92,246,0.07)" : "none",
            paddingLeft: Icon ? "2.6rem" : "1rem",
          }}
        />
      </div>
      {hint && <p className="text-xs" style={{ color: "#4a4a60" }}>{hint}</p>}
    </div>
  );
}

function Textarea({
  id, label, value, onChange, placeholder, required,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>{label}</label>
      <textarea
        id={id} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} rows={3}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className="w-full rounded-xl py-3 px-4 text-white placeholder-[#3a3a52] outline-none transition-all text-sm resize-none"
        style={{
          background: "#0e0e18",
          border: `1px solid ${focused ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.07)"}`,
          boxShadow: focused ? "0 0 0 3px rgba(139,92,246,0.07)" : "none",
        }}
      />
    </div>
  );
}

function FileUpload({
  label, fieldName, file, onFile, accept, hint,
}: {
  label: string; fieldName: string; file: File | null;
  onFile: (f: File | null) => void; accept?: string; hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>{label}</p>
      <div
        onClick={() => ref.current?.click()}
        className="relative rounded-xl p-4 cursor-pointer transition-all duration-200 flex items-center gap-3"
        style={{
          background: file ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.02)",
          border: `1px dashed ${file ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.1)"}`,
        }}
        onMouseOver={e => { e.currentTarget.style.background = "rgba(139,92,246,0.06)"; }}
        onMouseOut={e => { e.currentTarget.style.background = file ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.02)"; }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: file ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {file ? <CheckCircle2 size={16} style={{ color: "#a78bfa" }} /> : <Upload size={16} style={{ color: "#4a4a62" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: file ? "#c4b5fd" : "#6a6a80" }}>
            {file ? file.name : "Click to upload"}
          </p>
          {hint && <p className="text-xs" style={{ color: "#4a4a50" }}>{hint}</p>}
        </div>
        {file && (
          <button type="button" onClick={e => { e.stopPropagation(); onFile(null); }}
            className="shrink-0 p-1 rounded-lg transition-colors"
            style={{ color: "#4a4a62" }}
            onMouseOver={e => { e.currentTarget.style.color = "#ef4444"; }}
            onMouseOut={e => { e.currentTarget.style.color = "#4a4a62"; }}>
            <X size={14} />
          </button>
        )}
      </div>
      <input ref={ref} type="file" id={fieldName} className="hidden"
        accept={accept || ".pdf,.jpg,.jpeg,.png"}
        onChange={e => onFile(e.target.files?.[0] || null)} />
    </div>
  );
}

// ─────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────

function StatusBanner({ status }: { status: string | null }) {
  if (!status) return null;
  const configs: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; msg: string }> = {
    PENDING: {
      icon: Clock, color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)",
      msg: "Your profile is pending admin review. You'll be notified within 2-3 business days.",
    },
    VERIFIED: {
      icon: CheckCircle2, color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)",
      msg: "✅ Your lawyer profile is verified! You're now visible in the Nyaya marketplace.",
    },
    REJECTED: {
      icon: AlertCircle, color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)",
      msg: "Your profile was not approved. Please update your documents and resubmit.",
    },
  };
  const c = configs[status] || configs.PENDING;
  const Icon = c.icon;
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl mb-6"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <Icon size={18} style={{ color: c.color, flexShrink: 0, marginTop: 1 }} />
      <p className="text-sm" style={{ color: c.color }}>{c.msg}</p>
    </div>
  );
}

const SPECIALIZATIONS = [
  "Criminal Law", "Civil Law", "Family Law", "Corporate Law", "Tax Law",
  "Property Law", "Labour Law", "Constitutional Law", "IP Law", "Cyber Law",
  "Consumer Law", "Human Rights", "Environmental Law", "Banking Law",
];

const PRACTICE_AREAS = [
  "Litigation", "Arbitration", "Mediation", "Legal Drafting", "Due Diligence",
  "Contract Review", "Legal Advisory", "Real Estate", "Mergers & Acquisitions",
];

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

export default function LawyerProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form fields
  const [bio, setBio] = useState("");
  const [firmName, setFirmName] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [enrollmentYear, setEnrollmentYear] = useState("");
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  // Files
  const [barCertFile, setBarCertFile] = useState<File | null>(null);
  const [degreeFile, setDegreeFile] = useState<File | null>(null);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "LAWYER")) {
      router.push("/login");
      return;
    }
    if (user) {
      api.get("/auth/me").then(({ data }) => {
        const vs = data.user?.lawyerProfile?.verificationStatus;
        setStatus(vs || "PENDING");
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const toggleSpec = (s: string) =>
    setSelectedSpecs(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleArea = (a: string) =>
    setSelectedAreas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barCertFile) { setError("Bar Certificate is required."); return; }
    setError(""); setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("bio", bio);
      fd.append("firmName", firmName);
      fd.append("officeAddress", officeAddress);
      if (yearsOfExperience) fd.append("yearsOfExperience", yearsOfExperience);
      if (enrollmentYear) fd.append("enrollmentYear", enrollmentYear);
      fd.append("specializations", JSON.stringify(selectedSpecs));
      fd.append("practiceAreas", JSON.stringify(selectedAreas));
      if (barCertFile) fd.append("barCertificate", barCertFile);
      if (degreeFile) fd.append("degreeCertificate", degreeFile);
      if (govIdFile) fd.append("governmentId", govIdFile);
      if (photoFile) fd.append("profilePhoto", photoFile);

      await api.post("/auth/lawyer/submit-profile", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(true);
      setStatus("PENDING");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070d" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "#8b5cf6" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#07070d" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 px-6 h-14 flex items-center justify-between"
        style={{ background: "rgba(7,7,13,0.92)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7c6ef7,#a855f7)", boxShadow: "0 0 20px rgba(124,110,247,0.4)" }}>
            <Scale size={15} className="text-white" />
          </div>
          <span className="text-base font-bold text-white">Nyaya</span>
        </div>
        <Link href="/" className="text-xs flex items-center gap-1.5 transition-colors"
          style={{ color: "#6a6a80" }}
          onMouseOver={e => (e.currentTarget.style.color = "#9d8fff")}
          onMouseOut={e => (e.currentTarget.style.color = "#6a6a80")}>
          ← Back to Dashboard
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
              <Briefcase size={18} style={{ color: "#a78bfa" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Lawyer Profile</h1>
              <p className="text-xs" style={{ color: "#6a6a80" }}>Complete your professional profile for admin verification</p>
            </div>
          </div>
        </div>

        <StatusBanner status={status} />

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-5 p-3.5 rounded-xl text-sm flex items-center gap-3"
              style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError("")} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 text-center"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.3)" }}>
              <CheckCircle2 size={36} style={{ color: "#4ade80" }} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Profile Submitted!</h2>
            <p className="text-sm mb-6" style={{ color: "#6a6a80" }}>
              Your documents are under admin review. You&apos;ll receive an email notification within 2-3 business days.
            </p>
            <Link href="/">
              <button className="w-full rounded-xl py-3 font-semibold text-white text-sm"
                style={{ background: "linear-gradient(135deg,#7c6ef7,#a855f7)" }}>
                Go to Dashboard
              </button>
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Professional Info */}
            <div className="rounded-2xl p-6 space-y-4"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User size={16} style={{ color: "#8b5cf6" }} /> Professional Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input id="firm-name" label="Firm / Chamber Name" value={firmName} onChange={setFirmName}
                  icon={Building2} placeholder="e.g. Sharma & Associates" />
                <Input id="exp" label="Years of Experience" type="number" value={yearsOfExperience}
                  onChange={setYearsOfExperience} icon={BookOpen} placeholder="e.g. 8" />
              </div>
              <Input id="enrollment" label="Enrollment Year" type="number" value={enrollmentYear}
                onChange={setEnrollmentYear} placeholder="e.g. 2015" />
              <Input id="address" label="Office Address" value={officeAddress} onChange={setOfficeAddress}
                placeholder="Full office address" />
              <Textarea id="bio" label="Professional Bio" value={bio} onChange={setBio}
                placeholder="Briefly describe your legal expertise, notable cases, and areas of practice..." />
            </div>

            {/* Specializations */}
            <div className="rounded-2xl p-6 space-y-4"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scale size={16} style={{ color: "#8b5cf6" }} /> Specializations
              </h3>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map(s => (
                  <button key={s} type="button" onClick={() => toggleSpec(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: selectedSpecs.includes(s) ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${selectedSpecs.includes(s) ? "rgba(139,92,246,0.45)" : "rgba(255,255,255,0.08)"}`,
                      color: selectedSpecs.includes(s) ? "#c4b5fd" : "#5a5a70",
                    }}>
                    {s}
                  </button>
                ))}
              </div>

              <h3 className="text-sm font-bold text-white flex items-center gap-2 pt-2">
                <Briefcase size={16} style={{ color: "#8b5cf6" }} /> Practice Areas
              </h3>
              <div className="flex flex-wrap gap-2">
                {PRACTICE_AREAS.map(a => (
                  <button key={a} type="button" onClick={() => toggleArea(a)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: selectedAreas.includes(a) ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${selectedAreas.includes(a) ? "rgba(168,85,247,0.45)" : "rgba(255,255,255,0.08)"}`,
                      color: selectedAreas.includes(a) ? "#d8b4fe" : "#5a5a70",
                    }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Upload */}
            <div className="rounded-2xl p-6 space-y-4"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield size={16} style={{ color: "#8b5cf6" }} /> Verification Documents
              </h3>
              <div className="rounded-xl p-3" style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.15)" }}>
                <p className="text-xs" style={{ color: "#8b5cf6" }}>
                  📋 Upload clear, legible copies. Accepted formats: PDF, JPG, PNG (max 10MB each).
                  Documents are reviewed confidentially by the Nyaya admin team.
                </p>
              </div>

              <FileUpload label="Bar Council Certificate *" fieldName="barCertificate"
                file={barCertFile} onFile={setBarCertFile} hint="Enrollment certificate from your Bar Council" />
              <FileUpload label="Law Degree Certificate" fieldName="degreeCertificate"
                file={degreeFile} onFile={setDegreeFile} hint="LLB / LLM degree certificate" />
              <FileUpload label="Government ID (Aadhaar / PAN / Passport)" fieldName="governmentId"
                file={govIdFile} onFile={setGovIdFile} hint="Any government-issued photo ID" />
              <FileUpload label="Profile Photo" fieldName="profilePhoto"
                file={photoFile} onFile={setPhotoFile} hint="Clear headshot photo (JPG/PNG)"
                accept=".jpg,.jpeg,.png" />
            </div>

            <motion.button type="submit" disabled={submitting}
              whileHover={{ scale: submitting ? 1 : 1.015 }} whileTap={{ scale: submitting ? 1 : 0.975 }}
              className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#7c6ef7,#a855f7)", boxShadow: "0 0 28px rgba(124,110,247,0.3)" }}>
              {submitting
                ? <><Loader2 size={16} className="animate-spin" /><span>Submitting...</span></>
                : <><span>Submit Profile for Review</span><ArrowRight size={16} /></>
              }
            </motion.button>
          </form>
        )}
      </div>
    </div>
  );
}
