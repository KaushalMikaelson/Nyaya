"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Calendar, FileText, Share2, 
  Clock, Plus, Scale, ChevronRight, X, Building2, ArrowRight, Briefcase, Lock, AlertCircle 
} from "lucide-react";

import api from "@/lib/api";

export default function CaseDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;
  
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'hearings' | 'documents'>('timeline');

  // Modals
  const [showHearingModal, setShowHearingModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState<{ show: boolean, message: string, type: 'error' | 'upgrade' }>({ show: false, message: '', type: 'error' });

  // Forms
  const [hearingForm, setHearingForm] = useState({ date: '', purpose: '', summary: '', nextHearingDate: '' });
  const [timelineForm, setTimelineForm] = useState({ title: '', description: '', date: '' });

  useEffect(() => {
    fetchCaseDetails();
  }, [caseId]);

  const fetchCaseDetails = async () => {
    try {
      const res = await api.get(`/cases/${caseId}`);
      setCaseData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post(`/cases/${caseId}/hearings`, hearingForm);
      setShowHearingModal(false);
      setHearingForm({ date: '', purpose: '', summary: '', nextHearingDate: '' });
      fetchCaseDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post(`/cases/${caseId}/timeline`, timelineForm);
      setShowTimelineModal(false);
      setTimelineForm({ title: '', description: '', date: '' });
      fetchCaseDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const { data: presigned } = await api.post('/documents/upload-url', {
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        sizeBytes: file.size,
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('caseId', caseId);
      formData.append('title', file.name);

      await api.post('/documents/local-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      fetchCaseDetails();
    } catch (err: any) {
      console.error('Upload failed:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to upload document';
      const isUpgrade = err.response?.data?.error === 'UPGRADE_REQUIRED';
      setUploadError({ show: true, message: errorMsg, type: isUpgrade ? 'upgrade' : 'error' });
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex flex-col justify-center items-center text-white">
        <h2 className="text-xl">Case not found.</h2>
        <button onClick={() => router.push('/cases')} className="mt-4 text-blue-400">Back to Cases</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-[#ededed] p-8 pt-24 font-sans max-w-7xl mx-auto">
      <button onClick={() => router.push('/cases')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm font-medium">
        <ArrowLeft size={16} /> Back to Cases
      </button>

      {/* Header Info */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Scale size={180} /></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-300 tracking-wider">
                {caseData.caseNumber || 'UNFILED'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wider border ${caseData.status === 'OPEN' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                {caseData.status}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">{caseData.title}</h1>
            <p className="text-slate-400 max-w-2xl">{caseData.description || 'No description provided.'}</p>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
             <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-900/50 px-4 py-2 rounded-xl backdrop-blur-md border border-slate-700/50">
               <Building2 size={16} className="text-amber-400" />
               <span className="font-medium">{caseData.firm ? caseData.firm.name : 'Solo Practice'}</span>
             </div>
             {caseData.court && (
               <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-900/50 px-4 py-2 rounded-xl backdrop-blur-md border border-slate-700/50">
                 <Scale size={16} className="text-blue-400" />
                 <span className="font-medium">{caseData.court}</span>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-1">
        <button onClick={() => setActiveTab('timeline')} className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
          Timeline
        </button>
        <button onClick={() => setActiveTab('hearings')} className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'hearings' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
          Hearings
        </button>
        <button onClick={() => setActiveTab('documents')} className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'documents' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
          Documents
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          
          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-[#111827] p-4 rounded-2xl border border-slate-800">
                <p className="text-sm text-slate-300">Case lifecycle and milestones</p>
                <button onClick={() => setShowTimelineModal(true)} className="flex items-center gap-2 text-sm font-medium bg-amber-500/10 text-amber-400 px-4 py-2 rounded-xl hover:bg-amber-500/20 transition-colors">
                  <Plus size={16} /> Add Event
                </button>
              </div>

              <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-amber-400 before:via-blue-500/50 before:to-transparent">
                {caseData.timeline?.length === 0 && <p className="text-slate-400 pl-4 py-4 relative z-10">No events logged yet.</p>}
                
                {caseData.timeline?.filter((evt: any, idx: number, arr: any[]) => 
                  idx === arr.findIndex((t: any) => 
                    t.title === evt.title && 
                    t.description === evt.description && 
                    new Date(t.date).toDateString() === new Date(evt.date).toDateString()
                  )
                ).map((evt: any, i: number) => (
                  <div key={evt.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-[#111827] bg-amber-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_10px_rgba(251,191,36,0.4)] z-10"></div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-[#111827] border border-slate-800 p-5 rounded-2xl shadow-lg transition-transform hover:-translate-y-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-white text-md">{evt.title}</h4>
                        <span className="text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded-md">{new Date(evt.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-400">{evt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HEARINGS TAB */}
          {activeTab === 'hearings' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-[#111827] p-4 rounded-2xl border border-slate-800 mb-6">
                <p className="text-sm text-slate-300">Scheduled court appearances</p>
                <button onClick={() => setShowHearingModal(true)} className="flex items-center gap-2 text-sm font-medium bg-blue-500/10 text-blue-400 px-4 py-2 rounded-xl hover:bg-blue-500/20 transition-colors">
                  <Plus size={16} /> Schedule Hearing
                </button>
              </div>

              {caseData.hearings?.length === 0 ? (
                 <div className="text-center py-20 bg-[#111827] border border-slate-800 rounded-2xl">
                   <Clock size={40} className="mx-auto text-slate-600 mb-4" />
                   <h3 className="text-xl font-semibold text-white mb-2">No hearings scheduled</h3>
                 </div>
              ) : (
                caseData.hearings?.map((h: any) => (
                  <div key={h.id} className="bg-[#111827] border border-slate-800 rounded-2xl p-6 hover:border-blue-500/50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                          <Calendar size={20} className="text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-200 text-lg">{h.purpose}</h3>
                          <p className="text-sm text-amber-400">{new Date(h.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    {h.summary && <p className="text-sm text-slate-400 bg-slate-900 p-4 rounded-xl border border-slate-800">{h.summary}</p>}
                    {h.nextHearingDate && (
                      <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                        <ArrowRight size={14} className="text-slate-600" /> Next hearing on {new Date(h.nextHearingDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center bg-[#111827] p-4 rounded-2xl border border-slate-800 mb-6">
                 <p className="text-sm text-slate-300">Case documents and evidence</p>
                 <button onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc} className="flex items-center gap-2 text-sm font-medium bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50">
                   {uploadingDoc ? "Uploading..." : <><Plus size={16} /> Upload File</>}
                 </button>
                 <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" />
               </div>
               
               {caseData.documents?.length === 0 ? (
                 <div className="text-center py-20 bg-[#111827] border border-slate-800 rounded-2xl">
                   <FileText size={40} className="mx-auto text-slate-600 mb-4" />
                   <h3 className="text-xl font-semibold text-white mb-2">Document Vault</h3>
                   <p className="text-slate-400 max-w-sm mx-auto mb-6">Attach drafted pleadings, evidence, and court orders.</p>
                   <button onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc} className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
                     {uploadingDoc ? "Uploading..." : "Upload File"}
                   </button>
                 </div>
               ) : (
                 caseData.documents?.map((doc: any) => (
                   <div key={doc.id} className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex justify-between items-center hover:border-slate-700 transition-colors">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                         <FileText size={18} className="text-slate-400" />
                       </div>
                       <div>
                         <h4 className="font-semibold text-slate-200">{doc.title}</h4>
                         <p className="text-xs text-slate-500 mt-1">Uploaded on {new Date(doc.createdAt).toLocaleDateString()} • {doc.status}</p>
                       </div>
                     </div>
                     <button className="text-blue-400 text-sm font-medium hover:underline" onClick={() => router.push(`/documents/${doc.id}`)}>View</button>
                   </div>
                 ))
               )}
            </div>
          )}

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
           <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
             <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Briefcase size={18} className="text-slate-400" /> Parties Involved</h3>
             <div className="space-y-4">
               <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Client</p>
                  <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">{caseData.client?.email?.charAt(0).toUpperCase() || 'U'}</div>
                    <div className="truncate text-sm text-slate-300">{caseData.client?.email}</div>
                  </div>
               </div>
               <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Primary Counsel</p>
                  {caseData.primaryCounsel ? (
                    <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-slate-900 shrink-0">{caseData.primaryCounsel?.email?.charAt(0).toUpperCase()}</div>
                      <div className="truncate text-sm text-slate-300">{caseData.primaryCounsel?.email}</div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Unassigned</p>
                  )}
               </div>
               <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Judge</p>
                  <div className="text-sm text-slate-300 bg-slate-900 p-3 rounded-xl border border-slate-800">
                    {caseData.judgeName || 'Not Assigned'}
                  </div>
               </div>
             </div>
           </div>
        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showHearingModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#111827] border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
               <button onClick={() => setShowHearingModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X size={20} /></button>
               <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Calendar className="text-blue-400" /> Schedule Hearing</h2>
               <form onSubmit={handleCreateHearing} className="space-y-4 mt-6">
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Date & Time *</label>
                   <input type="datetime-local" required value={hearingForm.date} onChange={e => setHearingForm({...hearingForm, date: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none transition-colors" />
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Purpose *</label>
                   <input required value={hearingForm.purpose} onChange={e => setHearingForm({...hearingForm, purpose: e.target.value})} placeholder="e.g. Cross Examination" className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none transition-colors" />
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Notes / Summary</label>
                   <textarea value={hearingForm.summary} onChange={e => setHearingForm({...hearingForm, summary: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none transition-colors resize-none h-20" />
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl mt-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                   {isSubmitting ? "Saving..." : "Save Hearing"}
                 </button>
               </form>
            </motion.div>
          </motion.div>
        )}

        {showTimelineModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#111827] border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
               <button onClick={() => setShowTimelineModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X size={20} /></button>
               <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Clock className="text-amber-400" /> Log Event</h2>
               <form onSubmit={handleCreateTimeline} className="space-y-4 mt-6">
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Event Title *</label>
                   <input required value={timelineForm.title} onChange={e => setTimelineForm({...timelineForm, title: e.target.value})} placeholder="e.g. Evidence Filed" className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors" />
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                   <textarea value={timelineForm.description} onChange={e => setTimelineForm({...timelineForm, description: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors h-20 resize-none" />
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Date (defaults to today)</label>
                   <input type="date" value={timelineForm.date} onChange={e => setTimelineForm({...timelineForm, date: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors" />
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold py-3 rounded-xl mt-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                   {isSubmitting ? "Adding..." : "Add Timeline Event"}
                 </button>
               </form>
            </motion.div>
          </motion.div>
        )}

        {uploadError.show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className={`bg-[#111827] border rounded-3xl p-8 w-full max-w-md shadow-2xl relative text-center ${uploadError.type === 'upgrade' ? 'border-amber-500/30 shadow-amber-500/10' : 'border-red-500/30 shadow-red-500/10'}`}>
               <button onClick={() => setUploadError({ show: false, message: '', type: 'error' })} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X size={20} /></button>
               <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${uploadError.type === 'upgrade' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                 {uploadError.type === 'upgrade' ? <Lock size={32} /> : <AlertCircle size={32} />}
               </div>
               <h2 className="text-2xl font-bold text-white mb-2">{uploadError.type === 'upgrade' ? 'Premium Feature' : 'Upload Failed'}</h2>
               <p className="text-slate-300 mb-8">{uploadError.message}</p>
               <button onClick={() => setUploadError({ show: false, message: '', type: 'error' })} className={`w-full font-semibold py-3 rounded-xl transition-colors ${uploadError.type === 'upgrade' ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}>
                 {uploadError.type === 'upgrade' ? 'Dismiss' : 'Close'}
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
