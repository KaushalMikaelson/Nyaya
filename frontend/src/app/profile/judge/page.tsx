"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, ArrowRight, AlertCircle, CheckCircle2, Clock,
  Upload, Shield, Gavel, Building2, User, FileText,
  Loader2, X, Info, RefreshCw,
} from "lucide-react";
import Link from "next/link";

// ─────────────────────────────────────────
// FILE UPLOAD
// ─────────────────────────────────────────

function FileUpload({
  label, fieldName, file, onFile, hint,
}: {
  label: string; fieldName: string; file: File | null;
  onFile: (f: File | null) => void; hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>{label}</p>
      <div
        onClick={() => ref.current?.click()}
        className="relative rounded-xl p-4 cursor-pointer transition-all duration-200 flex items-center gap-3"
        style={{
          background: file ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.02)",
          border: `1px dashed ${file ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.1)"}`,
        }}
        onMouseOver={e => { e.currentTarget.style.background = "rgba(168,85,247,0.06)"; }}
        onMouseOut={e => { e.currentTarget.style.background = file ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.02)"; }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: file ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {file ? <CheckCircle2 size={16} style={{ color: "#d8b4fe" }} /> : <Upload size={16} style={{ color: "#4a4a62" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: file ? "#d8b4fe" : "#6a6a80" }}>
            {file ? file.name : "Click to upload"}
          </p>
          {hint && <p className="text-xs" style={{ color: "#4a4a50" }}>{hint}</p>}
        </div>
        {file && (
          <button type="button" onClick={e => { e.stopPropagation(); onFile(null); }}
            className="shrink-0 p-1 rounded-lg transition-colors" style={{ color: "#4a4a62" }}
            onMouseOver={e => { e.currentTarget.style.color = "#ef4444"; }}
            onMouseOut={e => { e.currentTarget.style.color = "#4a4a62"; }}>
            <X size={14} />
          </button>
        )}
      </div>
      <input ref={ref} type="file" id={fieldName} className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={e => onFile(e.target.files?.[0] || null)} />
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────

export default function JudgeProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  type JudgeStatus = "PENDING" | "VERIFIED" | "REJECTED" | null;
  const [status, setStatus] = useState<JudgeStatus>(null);
  const [profileDetails, setProfileDetails] = useState<{
    fullName?: string; governmentId?: string; court?: string;
    courtLevel?: string; verificationNote?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "JUDGE")) {
      router.push("/login");
      return;
    }
    if (user) {
      api.get("/auth/me").then(({ data }) => {
        const jp = data.user?.judgeProfile;
        setStatus((jp?.verificationStatus as JudgeStatus) || "PENDING");
        setProfileDetails({
          fullName: jp?.fullName,
          governmentId: jp?.governmentId,
          court: jp?.court,
          courtLevel: jp?.courtLevel,
          verificationNote: jp?.verificationNote,
        });
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!govIdFile) { setError("Please select a government ID document to upload."); return; }
    setError(""); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("governmentIdDoc", govIdFile);
      await api.post("/auth/judge/upload-doc", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploaded(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070d" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "#a855f7" }} />
      </div>
    );
  }

  const statusConfig = {
    PENDING: {
      icon: Clock, color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)",
      title: "Account Pending Approval",
      msg: "Your judge account has been submitted for admin review. This typically takes 2-5 business days.",
    },
    VERIFIED: {
      icon: CheckCircle2, color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)",
      title: "Account Verified",
      msg: "Your Nyaya judge account is verified and active. You have full access to judicial tools.",
    },
    REJECTED: {
      icon: AlertCircle, color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)",
      title: "Account Not Approved",
      msg: profileDetails.verificationNote
        ? `Reason: ${profileDetails.verificationNote}`
        : "Your registration was not approved. Please contact support or re-register with correct information.",
    },
  };

  const sc = status ? statusConfig[status] : statusConfig.PENDING;
  const StatusIcon = sc.icon;

  return (
    <div className="min-h-screen" style={{ background: "#07070d" }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 px-6 h-14 flex items-center justify-between"
        style={{ background: "rgba(7,7,13,0.9)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(16px)" }}>
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

      <div className="max-w-xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.25)" }}>
            <Gavel size={18} style={{ color: "#d8b4fe" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Judge Account Status</h1>
            <p className="text-xs" style={{ color: "#6a6a80" }}>Government credential verification portal</p>
          </div>
        </div>

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

        {/* Status Card */}
        <div className="rounded-2xl p-6 mb-6"
          style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${sc.color}20`, border: `1px solid ${sc.color}40` }}>
              <StatusIcon size={22} style={{ color: sc.color }} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white mb-1">{sc.title}</h3>
              <p className="text-sm" style={{ color: "#7a7a90" }}>{sc.msg}</p>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="rounded-2xl p-6 mb-6 space-y-3"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <User size={16} style={{ color: "#a855f7" }} /> Your Registration Details
          </h3>
          {[
            { icon: User, label: "Full Name", value: profileDetails.fullName },
            { icon: Shield, label: "Government / Judicial ID", value: profileDetails.governmentId },
            { icon: Building2, label: "Court", value: profileDetails.court },
            { icon: FileText, label: "Court Level", value: profileDetails.courtLevel },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-2.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <Icon size={14} style={{ color: "#6a6a80", flexShrink: 0 }} />
              <span className="text-xs" style={{ color: "#5a5a70" }}>{label}</span>
              <span className="ml-auto text-xs font-medium" style={{ color: value ? "#c8c8e0" : "#3a3a50" }}>
                {value || "—"}
              </span>
            </div>
          ))}
        </div>

        {/* Document Upload (only if PENDING or REJECTED) */}
        {(status === "PENDING" || status === "REJECTED") && (
          <div className="rounded-2xl p-6"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Shield size={16} style={{ color: "#a855f7" }} /> Upload Government ID Document
            </h3>

            <div className="p-3.5 rounded-xl mb-4 flex items-start gap-2.5"
              style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
              <Info size={14} style={{ color: "#a855f7", flexShrink: 0, marginTop: 2 }} />
              <p className="text-xs" style={{ color: "#7a7a90" }}>
                Upload a clear scan of your judicial appointment letter, court ID card, or government employee ID.
                This speeds up the verification process.
              </p>
            </div>

            {uploaded ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <CheckCircle2 size={18} style={{ color: "#4ade80" }} />
                <div>
                  <p className="text-sm font-medium text-white">Document uploaded successfully</p>
                  <p className="text-xs" style={{ color: "#5a5a70" }}>Admin will review it shortly.</p>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleUpload} className="space-y-4">
                <FileUpload
                  label="Government ID Document *"
                  fieldName="governmentIdDoc"
                  file={govIdFile}
                  onFile={setGovIdFile}
                  hint="Accepted: PDF, JPG, PNG (max 10 MB)"
                />
                <motion.button type="submit" disabled={submitting || !govIdFile}
                  whileHover={{ scale: submitting ? 1 : 1.015 }} whileTap={{ scale: submitting ? 1 : 0.975 }}
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#7c6ef7,#a855f7)", boxShadow: "0 0 24px rgba(124,110,247,0.3)" }}>
                  {submitting
                    ? <><Loader2 size={16} className="animate-spin" /><span>Uploading...</span></>
                    : <><Upload size={16} /><span>Upload Document</span></>}
                </motion.button>
              </form>
            )}
          </div>
        )}

        {/* Verified state: access panel */}
        {status === "VERIFIED" && (
          <div className="rounded-2xl p-6"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Gavel size={16} style={{ color: "#a855f7" }} /> Judicial Tools Access
            </h3>
            {[
              { icon: Scale, label: "Case Management", desc: "Manage and review assigned cases", href: "/" },
              { icon: FileText, label: "Document Review", desc: "Access case documents securely", href: "/" },
              { icon: Shield, label: "AI Legal Analysis", desc: "AI-powered case intelligence", href: "/intelligence" },
            ].map(({ icon: Icon, label, desc, href }) => (
              <Link key={label} href={href}>
                <div className="flex items-center gap-3 p-3.5 rounded-xl mb-2 cursor-pointer transition-all"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                  onMouseOver={e => { e.currentTarget.style.background = "rgba(168,85,247,0.07)"; e.currentTarget.style.borderColor = "rgba(168,85,247,0.2)"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}>
                  <Icon size={15} style={{ color: "#8b5cf6" }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs" style={{ color: "#5a5a70" }}>{desc}</p>
                  </div>
                  <ArrowRight size={14} style={{ color: "#4a4a60" }} />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Refresh status */}
        {status === "PENDING" && (
          <button
            onClick={() => { setLoading(true); api.get("/auth/me").then(({ data }) => { setStatus(data.user?.judgeProfile?.verificationStatus || "PENDING"); }).finally(() => setLoading(false)); }}
            className="mt-4 w-full flex items-center justify-center gap-2 text-xs py-2 rounded-xl transition-all"
            style={{ color: "#5a5a70", border: "1px solid rgba(255,255,255,0.05)" }}
            onMouseOver={e => { e.currentTarget.style.color = "#9d8fff"; e.currentTarget.style.borderColor = "rgba(124,110,247,0.2)"; }}
            onMouseOut={e => { e.currentTarget.style.color = "#5a5a70"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}>
            <RefreshCw size={12} /> Refresh Status
          </button>
        )}
      </div>
    </div>
  );
}
