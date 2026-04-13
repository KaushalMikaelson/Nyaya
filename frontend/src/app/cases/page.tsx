"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Plus, User, Search, FileText, ArrowRight, X, Building2, Bell } from "lucide-react";

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showFirmModal, setShowFirmModal] = useState(false);

  // New Case Form
  const [caseForm, setCaseForm] = useState({ title: '', description: '', caseNumber: '', court: '', judgeName: '', firmId: '' });
  // New Firm Form
  const [firmForm, setFirmForm] = useState({ name: '', description: '' });

  // For multi-lawyer firm support
  const [userContext, setUserContext] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      
      const userRes = await fetch("http://localhost:3001/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await userRes.json();
      setUserContext(userData.user);

      const res = await fetch("http://localhost:3001/api/cases", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(caseForm)
      });
      if (res.ok) {
        setShowCaseModal(false);
        setCaseForm({ title: '', description: '', caseNumber: '', court: '', judgeName: '', firmId: '' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3001/api/cases/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(firmForm)
      });
      if (res.ok) {
        setShowFirmModal(false);
        setFirmForm({ name: '', description: '' });
        // Can reload user fetching or something
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-[#ededed] p-8 pt-24 font-sans relative overflow-x-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[300px] h-[300px] bg-yellow-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-white flex items-center gap-3">
              <Briefcase className="text-blue-500" size={32} />
              Case Management
            </h1>
            <p className="text-slate-400 text-lg">Manage your entire legal lifecycle dynamically in one place.</p>
          </div>

          <div className="flex gap-4">
            {userContext?.role === 'LAWYER' && (
              <button onClick={() => setShowFirmModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#141b2e] border border-slate-700 rounded-xl hover:bg-[#1a233a] hover:border-slate-500 transition-all font-medium text-sm text-slate-200">
                <Building2 size={16} className="text-amber-400" /> New Firm
              </button>
            )}
            <button onClick={() => setShowCaseModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] font-medium text-sm text-white">
              <Plus size={16} /> Open New Case
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-4">
            {cases.length === 0 ? (
              <div className="text-center py-20 bg-[#111827] border border-slate-800 rounded-2xl">
                <Briefcase size={40} className="mx-auto text-slate-600 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No active cases</h3>
                <p className="text-slate-400 max-w-sm mx-auto mb-6">Create your first case to track hearings, documents, and manage timeline milestones.</p>
                <button onClick={() => setShowCaseModal(true)} className="text-blue-400 hover:text-blue-300 font-medium">Create a case →</button>
              </div>
            ) : (
              cases.map(c => (
                <div onClick={() => router.push(`/cases/${c.id}`)} key={c.id} className="group bg-[#111827] hover:bg-[#151c2d] border border-slate-800 hover:border-slate-600 rounded-2xl p-6 transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 uppercase font-semibold tracking-wider">
                        {c.caseNumber || 'DRAFT'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-[10px] text-blue-400 border border-blue-500/20 uppercase font-semibold tracking-wider">
                        {c.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1 truncate group-hover:text-amber-400 transition-colors">{c.title}</h2>
                    <p className="text-sm text-slate-400 line-clamp-2">{c.description || 'No description provided.'}</p>
                  </div>
                  
                  <div className="flex items-center gap-8 shrink-0">
                    {c.court && (
                      <div className="text-sm hidden md:block">
                        <p className="text-slate-500 text-xs mb-1">Court</p>
                        <p className="font-medium text-slate-200">{c.court}</p>
                      </div>
                    )}
                    <div className="text-sm">
                      <p className="text-slate-500 text-xs mb-1">Last Updated</p>
                      <p className="font-medium text-slate-200">{new Date(c.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-amber-500/10 group-hover:text-amber-400 transition-colors">
                      <ArrowRight size={18} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

      </div>

      {/* Case Creation Modal */}
      <AnimatePresence>
        {showCaseModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#111827] border border-slate-700 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative">
               <button onClick={() => setShowCaseModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X size={20} /></button>
               <h2 className="text-2xl font-bold text-white mb-6">Open New Case</h2>
               <form onSubmit={handleCreateCase} className="space-y-4">
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Case Title *</label>
                   <input required value={caseForm.title} onChange={e => setCaseForm({...caseForm, title: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none transition-colors" />
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                   <textarea value={caseForm.description} onChange={e => setCaseForm({...caseForm, description: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none transition-colors h-24 resize-none" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1">Case Number</label>
                     <input value={caseForm.caseNumber} onChange={e => setCaseForm({...caseForm, caseNumber: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none transition-colors" />
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-slate-400 mb-1">Court</label>
                     <input value={caseForm.court} onChange={e => setCaseForm({...caseForm, court: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none transition-colors" />
                   </div>
                 </div>
                 
                 {userContext?.role === 'LAWYER' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Firm ID (Optional)</label>
                    <input placeholder="Assign this case to a firm" value={caseForm.firmId} onChange={e => setCaseForm({...caseForm, firmId: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none transition-colors" />
                  </div>
                 )}

                 <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl mt-4 transition-colors">
                   Save Case
                 </button>
               </form>
            </motion.div>
          </motion.div>
        )}

        {showFirmModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#111827] border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
               <button onClick={() => setShowFirmModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X size={20} /></button>
               <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Building2 className="text-amber-400" /> New Firm setup</h2>
               <p className="text-slate-400 text-sm mb-6">Create a shared workspace for your multi-lawyer team.</p>
               <form onSubmit={handleCreateFirm} className="space-y-4">
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Firm Name *</label>
                   <input required value={firmForm.name} onChange={e => setFirmForm({...firmForm, name: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors" />
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                   <textarea value={firmForm.description} onChange={e => setFirmForm({...firmForm, description: e.target.value})} className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors h-24 resize-none" />
                 </div>
                 
                 <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold py-3 rounded-xl mt-4 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                   Create Firm Profile
                 </button>
               </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
