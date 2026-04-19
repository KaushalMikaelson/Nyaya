"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Upload, Trash2, Eye, AlertCircle, CheckCircle,
  Clock, Loader2, Scale, Menu, X, ChevronRight, RefreshCw,
  FileSearch, Sparkles, ShieldCheck, Bell, LogOut, LayoutDashboard,
  Zap, Briefcase, Users, FileStack, CreditCard, ShieldAlert, Search,
  ChevronDown, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import ReactMarkdown from "react-markdown";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDocument {
  id: string;
  title: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  documentType: string | null;
  summary: string | null;
  partiesInvolved: string[];
  caseId: string | null;
  case?: { id: string; title: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface FullDocument extends UserDocument {
  analysisReport: string | null;
  s3Url: string;
  consentGrantedAt: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const DOC_TYPE_COLORS: Record<string, string> = {
  "Contract/Agreement": "bg-blue-100 text-blue-700",
  "Legal Notice": "bg-orange-100 text-orange-700",
  "Court Judgment/Order": "bg-purple-100 text-purple-700",
  "FIR/Police Report": "bg-red-100 text-red-700",
  "Identity/KYC Document": "bg-green-100 text-green-700",
  "Petition": "bg-indigo-100 text-indigo-700",
  "Affidavit": "bg-yellow-100 text-yellow-700",
  "Power of Attorney": "bg-teal-100 text-teal-700",
  "Will/Testament": "bg-pink-100 text-pink-700",
  "Other": "bg-slate-100 text-slate-600",
};

function StatusBadge({ status }: { status: UserDocument["status"] }) {
  const map = {
    PENDING: { icon: Clock, label: "Queued", class: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    PROCESSING: { icon: Loader2, label: "Analyzing", class: "bg-blue-50 text-blue-700 border-blue-200" },
    READY: { icon: CheckCircle, label: "Ready", class: "bg-green-50 text-green-700 border-green-200" },
    FAILED: { icon: AlertCircle, label: "Failed", class: "bg-red-50 text-red-700 border-red-200" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.class}`}>
      <s.icon size={11} className={status === "PROCESSING" ? "animate-spin" : ""} />
      {s.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [consentGiven, setConsentGiven] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/landing");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const { data } = await api.get(`/documents?${params.toString()}`);
      setDocuments(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!consentGiven) {
      alert("Please give consent for AI processing before uploading.");
      return;
    }

    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("File too large. Maximum size is 25 MB.");
      return;
    }

    const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      alert("Only PDF, JPG, PNG, and WEBP files are allowed.");
      return;
    }

    await uploadDocument(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadDocument = async (file: File) => {
    setUploading(true);
    setUploadProgress(10);

    try {
      // Step 1: Request upload URL
      const { data: urlData } = await api.post("/documents/upload-url", {
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      setUploadProgress(30);

      if (urlData.isLocal) {
        // Dev mode: upload via backend
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
        formData.append("consentGranted", "true");

        setUploadProgress(60);

        const { data: uploadData } = await api.post("/documents/local-upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setUploadProgress(85);

        // Queue AI processing
        if (uploadData.docId) {
          await api.post(`/documents/analyze-doc/${uploadData.docId}`).catch(() => {});
        }
      } else {
        // Production: direct browser → S3, then confirm
        const formData = new FormData();
        formData.append("file", file);

        // Note: In prod, PUT to urlData.uploadUrl via fetch
        setUploadProgress(70);

        await api.post("/documents/confirm", {
          s3Key: urlData.s3Key,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          consentGranted: true,
        });
      }

      setUploadProgress(100);
      setTimeout(() => {
        setUploadProgress(0);
        fetchDocuments();
      }, 600);

    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.error === "UPGRADE_REQUIRED") {
        alert(err.response.data.message || "Document uploads require a Pro plan. Please upgrade.");
      } else {
        alert("Upload failed. Please try again.");
      }
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const viewDocument = async (doc: UserDocument) => {
    setViewLoading(true);
    try {
      const { data } = await api.get(`/documents/${doc.id}`);
      setSelectedDoc(data.data);
    } catch {
      alert("Failed to load document details.");
    } finally {
      setViewLoading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(prev => prev.filter(d => d.id !== id));
      setTotal(prev => prev - 1);
      if (selectedDoc?.id === id) setSelectedDoc(null);
    } catch {
      alert("Failed to delete document.");
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(null);
    }
  };

  const reanalyzeDoc = async (id: string) => {
    try {
      await api.post(`/documents/analyze-doc/${id}`);
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: "PENDING" } : d));
      alert("Re-analysis queued! Refresh in a moment.");
    } catch {
      alert("Failed to queue re-analysis.");
    }
  };

  const filteredDocs = documents.filter(d =>
    d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.originalName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.documentType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-4">
          <Scale size={32} className="text-[#0f172a] animate-pulse" />
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8f9fa] text-[#1e293b] font-sans">

      {/* Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── SIDEBAR (matches main app) ─── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-transform duration-300 ease-in-out bg-[#0f172a] border-r border-slate-800 shadow-[20px_0_50px_rgba(0,0,0,0.2)] ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-1.5 px-3 h-[60px] shrink-0 border-b border-slate-800">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white transition-colors">
            <Scale size={16} />
            <span className="text-sm font-semibold text-white">Nyaay AI</span>
          </button>
          <button className="md:hidden ml-auto w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-1 px-3 py-4 border-b border-slate-800">
          <button onClick={() => router.push("/")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button onClick={() => router.push("/ask-nyaya")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <Zap size={18} /> Ask Nyaay
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-slate-800 text-[#d4af37] transition-colors">
            <FileStack size={18} /> Documents
          </button>
          <button onClick={() => router.push("/cases")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <Briefcase size={18} /> Case Management
          </button>
          <button onClick={() => router.push("/marketplace")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <Users size={18} /> Lawyer Marketplace
          </button>
          <button onClick={() => router.push("/notifications")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <Bell size={18} /> Notifications
          </button>
          {user.role === "ADMIN" && (
            <button onClick={() => router.push("/admin")} className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950 transition-colors">
              <ShieldAlert size={18} /> Admin Console
            </button>
          )}
        </div>

        <div className="flex-1" />

        <div className="px-3 pb-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-800 transition-colors cursor-pointer group border border-slate-800" onClick={logout}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs text-[#0f172a] bg-white">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium text-slate-300 group-hover:text-white">{user.email.split("@")[0]}</div>
              <div className="text-[11px] text-slate-500">{user.role}</div>
            </div>
            <LogOut size={14} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-all" />
          </div>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Topbar */}
        <header className="flex items-center justify-between h-14 px-4 md:px-6 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-[#0f172a] hover:bg-slate-100 transition-colors" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push("/")} className="text-slate-400 hover:text-slate-600 transition-colors">
                <ArrowLeft size={16} />
              </button>
              <FileStack size={18} className="text-[#0f172a]" />
              <h1 className="text-sm font-bold text-[#0f172a]">Document Intelligence</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#0f172a] text-white rounded-full text-xs font-bold tracking-wider uppercase">
              <ShieldCheck size={12} className="text-[#d4af37]" /> {user.role}
            </div>
            <div className="w-7 h-7 rounded-full bg-[#0f172a] flex items-center justify-center text-white text-xs font-bold">
              {user.email[0].toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* ─── DOCUMENT LIST ─── */}
          <div className={`flex flex-col ${selectedDoc ? "w-[45%] border-r border-slate-200" : "w-full"} overflow-hidden transition-all duration-300`}>

            {/* Controls bar */}
            <div className="px-5 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-500 font-medium">
                    {total} document{total !== 1 ? "s" : ""} total
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg hover:bg-[#1e2d3d] transition-colors disabled:opacity-60 shadow-sm"
                >
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  {uploading ? "Uploading..." : "Upload Document"}
                </button>
              </div>

              {/* Consent toggle */}
              {!consentGiven && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 mb-3">
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-semibold mb-1">Consent required for AI analysis</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={consentGiven} onChange={e => setConsentGiven(e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#0f172a]" />
                      <span>I consent to AI processing for legal analysis under DPDP Act 2023. My data will not be used for model training.</span>
                    </label>
                  </div>
                </motion.div>
              )}

              {/* Upload progress */}
              {uploading && uploadProgress > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Uploading & queuing AI analysis...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-[#0f172a] rounded-full" animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>
              )}

              {/* Search + filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-slate-400 transition-colors"
                  />
                </div>
                <select
                  value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Queued</option>
                  <option value="PROCESSING">Analyzing</option>
                  <option value="READY">Ready</option>
                  <option value="FAILED">Failed</option>
                </select>
                <button onClick={fetchDocuments} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-[#0f172a] hover:bg-slate-50 transition-colors" title="Refresh">
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            {/* Document list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Loading documents...</span>
                </div>
              ) : filteredDocs.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <FileSearch size={28} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">
                      {searchQuery ? "No documents match your search" : "No documents yet"}
                    </p>
                    <p className="text-sm text-slate-400">
                      {searchQuery ? "Try a different search term" : "Upload your first legal document to get AI-powered analysis"}
                    </p>
                  </div>
                  {!searchQuery && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] text-white text-sm font-semibold rounded-lg hover:bg-[#1e2d3d] transition-colors"
                    >
                      <Upload size={14} /> Upload Document
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredDocs.map((doc, i) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => viewDocument(doc)}
                      className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors group relative ${selectedDoc?.id === doc.id ? "bg-slate-50 border-l-2 border-l-[#0f172a]" : ""}`}
                    >
                      {/* File icon */}
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
                        <FileText size={18} className="text-slate-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800 truncate leading-5">{doc.title}</p>
                          <StatusBadge status={doc.status} />
                        </div>

                        {doc.documentType && (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${DOC_TYPE_COLORS[doc.documentType] || DOC_TYPE_COLORS["Other"]}`}>
                            {doc.documentType}
                          </span>
                        )}

                        {doc.summary && (
                          <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">{doc.summary}</p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-medium">
                          <span>{formatBytes(doc.sizeBytes)}</span>
                          <span>·</span>
                          <span>{formatDate(doc.createdAt)}</span>
                          {doc.case && <><span>·</span><span className="text-blue-500">📁 {doc.case.title}</span></>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {doc.status === "FAILED" && (
                          <button
                            onClick={e => { e.stopPropagation(); reanalyzeDoc(doc.id); }}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                            title="Retry analysis"
                          >
                            <RefreshCw size={13} />
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setShowDeleteConfirm(doc.id); }}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── DOCUMENT DETAIL PANEL ─── */}
          <AnimatePresence>
            {selectedDoc && (
              <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col overflow-hidden bg-white"
              >
                {/* Detail header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={selectedDoc.status} />
                      {selectedDoc.documentType && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${DOC_TYPE_COLORS[selectedDoc.documentType] || DOC_TYPE_COLORS["Other"]}`}>
                          {selectedDoc.documentType}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-[#0f172a] truncate">{selectedDoc.title}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedDoc.originalName} · {formatBytes(selectedDoc.sizeBytes)} · {formatDate(selectedDoc.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedDoc.status === "FAILED" && (
                      <button onClick={() => reanalyzeDoc(selectedDoc.id)}
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Retry">
                        <RefreshCw size={15} />
                      </button>
                    )}
                    <button onClick={() => setShowDeleteConfirm(selectedDoc.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                      <Trash2 size={15} />
                    </button>
                    <button onClick={() => setSelectedDoc(null)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Detail body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {viewLoading ? (
                    <div className="flex items-center justify-center h-32 gap-3">
                      <Loader2 size={20} className="animate-spin text-slate-400" />
                      <span className="text-sm text-slate-500">Loading analysis...</span>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Summary */}
                      {selectedDoc.summary && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className="text-[#d4af37]" />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">AI Summary</span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{selectedDoc.summary}</p>
                        </div>
                      )}

                      {/* Parties */}
                      {selectedDoc.partiesInvolved?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Parties Involved</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedDoc.partiesInvolved.map((p, i) => (
                              <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Case link */}
                      {selectedDoc.case && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                          <Briefcase size={14} className="text-blue-600 shrink-0" />
                          <span className="text-xs text-blue-700">Linked to case: <span className="font-semibold">{selectedDoc.case.title}</span></span>
                          <button onClick={() => router.push(`/cases`)} className="ml-auto text-blue-600 hover:text-blue-700">
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      )}

                      {/* Full Analysis */}
                      {selectedDoc.status === "READY" && selectedDoc.analysisReport ? (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <FileSearch size={14} className="text-[#0f172a]" />
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Full Legal Analysis</p>
                          </div>
                          <div className="prose prose-sm prose-slate max-w-none bg-white rounded-xl p-4 border border-slate-100 text-[13px] leading-relaxed">
                            <ReactMarkdown>{selectedDoc.analysisReport}</ReactMarkdown>
                          </div>
                          <p className="mt-3 text-[11px] text-slate-400 italic">
                            ⚠️ This is AI-generated analysis, not legal advice. Always consult a qualified lawyer before taking action.
                          </p>
                        </div>
                      ) : selectedDoc.status === "PENDING" || selectedDoc.status === "PROCESSING" ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <Loader2 size={24} className="text-blue-500 animate-spin" />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-slate-700">AI Analysis in Progress</p>
                            <p className="text-sm text-slate-400 mt-1">This may take 30–60 seconds. Refresh to check status.</p>
                          </div>
                          <button onClick={() => viewDocument(selectedDoc)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <RefreshCw size={12} /> Check Status
                          </button>
                        </div>
                      ) : selectedDoc.status === "FAILED" ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                            <AlertCircle size={24} className="text-red-500" />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-slate-700">Analysis Failed</p>
                            <p className="text-sm text-slate-400 mt-1">{selectedDoc.summary || "The document could not be processed."}</p>
                          </div>
                          <button onClick={() => reanalyzeDoc(selectedDoc.id)}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#0f172a] text-white rounded-lg hover:bg-[#1e2d3d] transition-colors">
                            <RefreshCw size={14} /> Retry Analysis
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
      </main>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-base font-bold text-[#0f172a] mb-2">Delete Document?</h3>
              <p className="text-sm text-slate-500 mb-5">
                This document and its AI analysis will be deleted. Per <strong>DPDP Act 2023</strong>, all personal data will be purged within 30 days. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 px-4 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700">
                  Cancel
                </button>
                <button
                  onClick={() => deleteDocument(showDeleteConfirm)}
                  disabled={deletingId === showDeleteConfirm}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
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
