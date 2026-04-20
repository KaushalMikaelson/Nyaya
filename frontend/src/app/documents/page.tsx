"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Upload, Trash2, AlertCircle, CheckCircle,
  Clock, Loader2, Scale, X, RefreshCw,
  FileSearch, Sparkles, Briefcase, Search, ArrowLeft, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import api from "@/lib/api";
import ReactMarkdown from "react-markdown";
import NyayaNav from "@/components/NyayaNav";

const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"] });

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserDocument {
  id: string; title: string; originalName: string; mimeType: string; sizeBytes: number;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  documentType: string | null; summary: string | null; summaryHi?: string | null;
  partiesInvolved: string[]; caseId: string | null;
  case?: { id: string; title: string } | null;
  createdAt: string; updatedAt: string;
}

interface FullDocument extends UserDocument {
  analysisReport: string | null; analysisReportHi?: string | null;
  s3Url: string; consentGrantedAt: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  "Contract/Agreement":  { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa" },
  "Legal Notice":        { bg: "rgba(251,146,60,0.12)",  color: "#fb923c" },
  "Court Judgment/Order":{ bg: "rgba(167,139,250,0.12)", color: "#a78bfa" },
  "FIR/Police Report":   { bg: "rgba(248,113,113,0.12)", color: "#f87171" },
  "Identity/KYC Document":{ bg:"rgba(52,211,153,0.12)",  color: "#34d399" },
  "Petition":            { bg: "rgba(99,102,241,0.12)",  color: "#818cf8" },
  "Affidavit":           { bg: "rgba(250,204,21,0.12)",  color: "#facc15" },
  "Other":               { bg: "rgba(100,116,139,0.12)", color: "#94a3b8" },
};

const STATUS_MAP = {
  PENDING:    { icon: Clock,         label: "Queued",    color: "#facc15", bg: "rgba(250,204,21,0.1)" },
  PROCESSING: { icon: Loader2,       label: "Analyzing", color: "#60a5fa", bg: "rgba(59,130,246,0.1)" },
  READY:      { icon: CheckCircle,   label: "Ready",     color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  FAILED:     { icon: AlertCircle,   label: "Failed",    color: "#f87171", bg: "rgba(248,113,113,0.1)" },
};

function StatusBadge({ status }: { status: UserDocument["status"] }) {
  const s = STATUS_MAP[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <s.icon size={11} className={status === "PROCESSING" ? "animate-spin" : ""} />
      {s.label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<FullDocument | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [consentGiven, setConsentGiven] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [language, setLanguage] = useState<"english" | "hindi">("english");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!authLoading && !user) router.push("/landing"); }, [authLoading, user, router]);
  useEffect(() => { if (user) fetchDocuments(); }, [user, statusFilter]);// eslint-disable-line

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const { data } = await api.get(`/documents?${params.toString()}`);
      setDocuments(data.data || []); setTotal(data.meta?.total || 0);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [statusFilter]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!consentGiven) { alert("Please give consent for AI processing before uploading."); return; }
    if (file.size > 25 * 1024 * 1024) { alert("File too large. Max 25 MB."); return; }
    if (!["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type)) { alert("Only PDF, JPG, PNG, WEBP allowed."); return; }
    await uploadDocument(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadDocument = async (file: File) => {
    setUploading(true); setUploadProgress(10);
    try {
      const { data: urlData } = await api.post("/documents/upload-url", { fileName: file.name, mimeType: file.type, sizeBytes: file.size });
      setUploadProgress(30);
      if (urlData.isLocal) {
        const formData = new FormData();
        formData.append("file", file); formData.append("title", file.name.replace(/\.[^/.]+$/, "")); formData.append("consentGranted", "true");
        setUploadProgress(60);
        const { data: uploadData } = await api.post("/documents/local-upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
        setUploadProgress(85);
        if (uploadData.docId) await api.post(`/documents/analyze-doc/${uploadData.docId}`).catch(() => {});
      } else {
        setUploadProgress(70);
        await api.post("/documents/confirm", { s3Key: urlData.s3Key, fileName: file.name, mimeType: file.type, sizeBytes: file.size, consentGranted: true });
      }
      setUploadProgress(100);
      setTimeout(() => { setUploadProgress(0); fetchDocuments(); }, 600);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.error === "UPGRADE_REQUIRED") alert(err.response.data.message || "Document uploads require a Pro plan.");
      else alert("Upload failed. Please try again.");
      setUploadProgress(0);
    } finally { setUploading(false); }
  };

  const viewDocument = async (doc: UserDocument | FullDocument) => {
    setViewLoading(true);
    try { const { data } = await api.get(`/documents/${doc.id}`); setSelectedDoc(data.data); }
    catch { alert("Failed to load document details."); } finally { setViewLoading(false); }
  };

  const switchLanguage = async (lang: "english" | "hindi") => {
    setLanguage(lang);
    if (lang === "hindi" && selectedDoc && !selectedDoc.analysisReportHi) await viewDocument(selectedDoc);
  };

  const deleteDocument = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(prev => prev.filter(d => d.id !== id)); setTotal(prev => prev - 1);
      if (selectedDoc?.id === id) setSelectedDoc(null);
    } catch { alert("Failed to delete document."); }
    finally { setDeletingId(null); setShowDeleteConfirm(null); }
  };

  const reanalyzeDoc = async (id: string) => {
    try { await api.post(`/documents/analyze-doc/${id}`); setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: "PENDING" } : d)); alert("Re-analysis queued!"); }
    catch { alert("Failed to queue re-analysis."); }
  };

  const filteredDocs = documents.filter(d =>
    d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.originalName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.documentType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Loading screen ───────────────────────────────────────────────────────────

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: "#070b16" }}>
        <div className="flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", boxShadow: "0 0 40px rgba(124,110,247,0.4)" }}>
            <Scale size={28} className="text-white" />
          </div>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "rgba(212,175,55,0.6)", animationDelay: `${i * 0.2}s` }} />)}
          </div>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans" style={{ background: "#070b16", color: "#ededed" }}>
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.div animate={{ scale: [1,1.2,1], opacity: [0.12,0.22,0.12] }} transition={{ duration: 12, repeat: Infinity }}
          style={{ position:"absolute", top:"5%", left:"0%", width:"40vw", height:"40vw", background:"#1a2b58", borderRadius:"50%", filter:"blur(140px)" }} />
        <motion.div animate={{ scale: [1,1.3,1], opacity: [0.05,0.1,0.05] }} transition={{ duration: 9, repeat: Infinity, delay: 4 }}
          style={{ position:"absolute", bottom:"10%", right:"5%", width:"30vw", height:"30vw", background:"#d4af37", borderRadius:"50%", filter:"blur(160px)" }} />
      </div>

      <NyayaNav user={user} logout={logout} active="documents" onBilling={() => {}} onUpgrade={() => {}} />

      <div className="flex flex-col flex-1 min-w-0 relative z-10">
        {/* Topbar */}
        <header className="flex items-center justify-between h-14 px-4 md:px-6 shrink-0 sticky top-0 z-30"
          style={{ background: "rgba(7,11,22,0.88)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(30,38,66,0.8)" }}>
          <div className="flex items-center gap-3">
            <button className="p-2 -ml-2 rounded-lg" style={{ color: "#4a4a62" }}
              onMouseEnter={e => (e.currentTarget.style.color="#a1a1aa")} onMouseLeave={e => (e.currentTarget.style.color="#4a4a62")}>
              {/* hamburger via NyayaNav */}
            </button>
            <button onClick={() => router.push("/")} className="flex items-center gap-1.5" style={{ color: "#4a4a62" }}
              onMouseEnter={e => (e.currentTarget.style.color="#a1a1aa")} onMouseLeave={e => (e.currentTarget.style.color="#4a4a62")}>
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <FileSearch size={17} style={{ color: "#d4af37" }} />
              <h1 className="text-sm font-bold text-white">Document Intelligence</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase"
              style={{ background: "rgba(212,175,55,0.1)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.2)" }}>
              {user.role}
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}>
              {user.email[0].toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">

          {/* ── DOCUMENT LIST ── */}
          <div className={`flex flex-col ${selectedDoc ? "w-[45%]" : "w-full"} overflow-hidden transition-all duration-300`}
            style={{ borderRight: selectedDoc ? "1px solid rgba(30,38,66,0.8)" : "none" }}>

            {/* Controls */}
            <div className="px-5 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(30,38,66,0.8)", background: "rgba(13,18,36,0.6)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold" style={{ color: "#4a4a62" }}>{total} document{total !== 1 ? "s" : ""} total</p>
                <motion.button
                  whileHover={{ boxShadow: "0 0 20px rgba(212,175,55,0.3)" }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? "Uploading..." : "Upload Document"}
                </motion.button>
              </div>

              {/* Consent */}
              {!consentGiven && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3 rounded-xl mb-3 text-xs"
                  style={{ background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.2)", color: "#d4af37" }}>
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">Consent required for AI analysis</p>
                    <label className="flex items-center gap-2 cursor-pointer font-medium" style={{ color: "#a1a1aa" }}>
                      <input type="checkbox" checked={consentGiven} onChange={e => setConsentGiven(e.target.checked)} className="w-3.5 h-3.5" />
                      I consent to AI processing under DPDP Act 2023. Data won't be used for training.
                    </label>
                  </div>
                </motion.div>
              )}

              {/* Upload progress */}
              {uploading && uploadProgress > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1" style={{ color: "#4a4a62" }}>
                    <span>Uploading & queuing AI analysis...</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div className="h-full rounded-full" animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }}
                      style={{ background: "linear-gradient(to right,#7c6ef7,#d4af37)" }} />
                  </div>
                </div>
              )}

              {/* Search + filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4a4a62" }} />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-xl outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", color: "#ededed" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.4)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "rgba(30,38,66,1)")} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl outline-none cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", color: "#a1a1aa" }}>
                  <option value="ALL">All</option>
                  <option value="PENDING">Queued</option>
                  <option value="PROCESSING">Analyzing</option>
                  <option value="READY">Ready</option>
                  <option value="FAILED">Failed</option>
                </select>
                <button onClick={fetchDocuments} className="p-2 rounded-xl transition-colors" title="Refresh"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", color: "#4a4a62" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color="#d4af37"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(212,175,55,0.3)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color="#4a4a62"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(30,38,66,1)"; }}>
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* List body */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-10 h-10 rounded-full animate-spin" style={{ border: "2px solid rgba(212,175,55,0.2)", borderTop: "2px solid #d4af37" }} />
                  <span className="text-sm" style={{ color: "#4a4a62" }}>Loading documents...</span>
                </div>
              ) : filteredDocs.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>
                    <FileSearch size={28} style={{ color: "#d4af37" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">{searchQuery ? "No documents match" : "No documents yet"}</p>
                    <p className="text-sm" style={{ color: "#4a4a62" }}>
                      {searchQuery ? "Try a different search term" : "Upload your first legal document"}
                    </p>
                  </div>
                  {!searchQuery && (
                    <motion.button whileHover={{ boxShadow: "0 0 20px rgba(212,175,55,0.3)" }}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl"
                      style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}>
                      <Upload size={14} /> Upload Document
                    </motion.button>
                  )}
                </motion.div>
              ) : (
                <div>
                  {filteredDocs.map((doc, i) => {
                    const tc = TYPE_COLORS[doc.documentType ?? "Other"] ?? TYPE_COLORS["Other"];
                    const isSelected = selectedDoc?.id === doc.id;
                    return (
                      <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        onClick={() => viewDocument(doc)}
                        className="flex items-start gap-3 px-5 py-4 cursor-pointer group relative transition-all"
                        style={{
                          borderBottom: "1px solid rgba(30,38,66,0.5)",
                          background: isSelected ? "rgba(212,175,55,0.06)" : "transparent",
                          borderLeft: isSelected ? "2px solid #d4af37" : "2px solid transparent",
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.025)"; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)" }}>
                          <FileText size={17} style={{ color: "#d4af37" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-white truncate leading-5">{doc.title}</p>
                            <StatusBadge status={doc.status} />
                          </div>
                          {doc.documentType && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                              style={{ background: tc.bg, color: tc.color }}>{doc.documentType}</span>
                          )}
                          {doc.summary && (
                            <p className="mt-1.5 text-xs line-clamp-2 leading-relaxed" style={{ color: "#6a6a82" }}>
                              {language === "hindi" && doc.summaryHi ? doc.summaryHi : doc.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[11px] font-medium" style={{ color: "#4a4a62" }}>
                            <span>{formatBytes(doc.sizeBytes)}</span><span>·</span><span>{formatDate(doc.createdAt)}</span>
                            {doc.case && <><span>·</span><span style={{ color: "#818cf8" }}>📁 {doc.case.title}</span></>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {doc.status === "FAILED" && (
                            <button onClick={e => { e.stopPropagation(); reanalyzeDoc(doc.id); }}
                              className="p-1.5 rounded-lg transition-colors" style={{ color: "#60a5fa" }} title="Retry">
                              <RefreshCw size={12} />
                            </button>
                          )}
                          <button onClick={e => { e.stopPropagation(); setShowDeleteConfirm(doc.id); }}
                            className="p-1.5 rounded-lg transition-colors" style={{ color: "#f87171" }} title="Delete">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── DETAIL PANEL ── */}
          <AnimatePresence>
            {selectedDoc && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col overflow-hidden"
                style={{ background: "rgba(10,15,29,0.8)" }}>
                {/* Detail header */}
                <div className="flex items-start justify-between px-6 py-4 shrink-0"
                  style={{ borderBottom: "1px solid rgba(30,38,66,0.8)" }}>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={selectedDoc.status} />
                      {selectedDoc.documentType && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: (TYPE_COLORS[selectedDoc.documentType] ?? TYPE_COLORS["Other"]).bg, color: (TYPE_COLORS[selectedDoc.documentType] ?? TYPE_COLORS["Other"]).color }}>
                          {selectedDoc.documentType}
                        </span>
                      )}
                    </div>
                    <h2 className={`${playfair.className} text-base font-medium text-white truncate`}>{selectedDoc.title}</h2>
                    <p className="text-xs mt-0.5" style={{ color: "#4a4a62" }}>
                      {selectedDoc.originalName} · {formatBytes(selectedDoc.sizeBytes)} · {formatDate(selectedDoc.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Language toggle */}
                    <div className="flex rounded-xl p-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)" }}>
                      {(["english","hindi"] as const).map(lang => (
                        <button key={lang} onClick={() => switchLanguage(lang)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                          style={language === lang
                            ? { background: "rgba(212,175,55,0.15)", color: "#d4af37" }
                            : { color: "#4a4a62" }}>
                          {lang === "english" ? "English" : "हिंदी"}
                        </button>
                      ))}
                    </div>
                    {selectedDoc.status === "FAILED" && (
                      <button onClick={() => reanalyzeDoc(selectedDoc.id)} className="p-2 rounded-xl transition-colors" style={{ color: "#60a5fa" }} title="Retry">
                        <RefreshCw size={14} />
                      </button>
                    )}
                    <button onClick={() => setShowDeleteConfirm(selectedDoc.id)} className="p-2 rounded-xl transition-colors" style={{ color: "#f87171" }} title="Delete">
                      <Trash2 size={14} />
                    </button>
                    <button onClick={() => setSelectedDoc(null)} className="p-2 rounded-xl transition-colors" style={{ color: "#4a4a62" }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Detail body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {viewLoading ? (
                    <div className="flex items-center justify-center h-32 gap-3">
                      <div className="w-8 h-8 animate-spin rounded-full" style={{ border: "2px solid rgba(212,175,55,0.2)", borderTop: "2px solid #d4af37" }} />
                      <span className="text-sm" style={{ color: "#4a4a62" }}>Loading analysis...</span>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Summary */}
                      {(selectedDoc.summary || selectedDoc.summaryHi) && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-2xl" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={13} style={{ color: "#d4af37" }} />
                            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#d4af37" }}>
                              {language === "hindi" ? "AI सारांश" : "AI Summary"}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: "#a1a1aa" }}>
                            {language === "hindi" && selectedDoc.summaryHi ? selectedDoc.summaryHi : selectedDoc.summary}
                          </p>
                        </motion.div>
                      )}

                      {/* Parties */}
                      {selectedDoc.partiesInvolved?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#4a4a62" }}>Parties Involved</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedDoc.partiesInvolved.map((p, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-medium"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", color: "#a1a1aa" }}>{p}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Case link */}
                      {selectedDoc.case && (
                        <div className="flex items-center gap-2 p-3 rounded-xl"
                          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                          <Briefcase size={13} style={{ color: "#818cf8" }} />
                          <span className="text-xs" style={{ color: "#818cf8" }}>Linked: <strong>{selectedDoc.case.title}</strong></span>
                          <button onClick={() => router.push("/cases")} className="ml-auto" style={{ color: "#818cf8" }}>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      )}

                      {/* Full analysis */}
                      {selectedDoc.status === "READY" && (selectedDoc.analysisReport || selectedDoc.analysisReportHi) ? (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#4a4a62" }}>
                            {language === "hindi" ? "पूर्ण कानूनी विश्लेषण" : "Full Legal Analysis"}
                          </p>
                          <div className="prose prose-sm max-w-none rounded-2xl p-5 text-[13px] leading-relaxed"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(30,38,66,1)", color: "#a1a1aa" }}>
                            <ReactMarkdown>{language === "hindi" && selectedDoc.analysisReportHi ? selectedDoc.analysisReportHi : (selectedDoc.analysisReport || "")}</ReactMarkdown>
                          </div>
                          <p className="mt-3 text-[11px] italic" style={{ color: "#4a4a62" }}>
                            ⚠️ AI-generated analysis. Always consult a qualified lawyer before taking action.
                          </p>
                        </div>
                      ) : (selectedDoc.status === "PENDING" || selectedDoc.status === "PROCESSING") ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
                            <Loader2 size={24} style={{ color: "#60a5fa" }} className="animate-spin" />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-white">AI Analysis in Progress</p>
                            <p className="text-sm mt-1" style={{ color: "#4a4a62" }}>This may take 30–60 seconds.</p>
                          </div>
                          <button onClick={() => viewDocument(selectedDoc)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl transition-colors"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", color: "#a1a1aa" }}>
                            <RefreshCw size={12} /> Check Status
                          </button>
                        </div>
                      ) : selectedDoc.status === "FAILED" ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                            <AlertCircle size={24} style={{ color: "#f87171" }} />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-white">Analysis Failed</p>
                            <p className="text-sm mt-1" style={{ color: "#4a4a62" }}>{selectedDoc.summary || "Document could not be processed."}</p>
                          </div>
                          <button onClick={() => reanalyzeDoc(selectedDoc.id)}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-colors"
                            style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}>
                            <RefreshCw size={13} /> Retry Analysis
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileSelect} />

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-3xl p-7 max-w-sm w-full mx-4" style={{ background: "#0d1224", border: "1px solid rgba(30,38,66,1)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
              onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
                <Trash2 size={20} style={{ color: "#f87171" }} />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Delete Document?</h3>
              <p className="text-sm mb-5" style={{ color: "#6a6a82" }}>
                Document & AI analysis will be permanently deleted. Per <strong style={{ color: "#a1a1aa" }}>DPDP Act 2023</strong>, data purged within 30 days.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 px-4 text-sm font-medium rounded-xl transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(30,38,66,1)", color: "#a1a1aa" }}>
                  Cancel
                </button>
                <button onClick={() => deleteDocument(showDeleteConfirm!)} disabled={deletingId === showDeleteConfirm}
                  className="flex-1 py-2.5 px-4 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }}>
                  {deletingId === showDeleteConfirm ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
