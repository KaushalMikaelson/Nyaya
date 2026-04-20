"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MapPin, Briefcase, Search, ArrowLeft, Send, X, Sparkles } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useAuth } from "@/contexts/AuthContext";
import NyayaNav from "@/components/NyayaNav";
import api from "@/lib/api";

const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"] });

interface Lawyer {
  id: string; name: string; specialties: string[];
  experienceYears: number; location: string; rating: number;
  hourlyRate: number; about: string; matchScore?: number; matchReason?: string;
}

const SPECIALTIES = ["Criminal Law","Family Law","Corporate Law","Property Law","Cyber Law","Labor & Employment Law"];

export default function MarketplacePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [caseDescription, setCaseDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isMatched, setIsMatched] = useState(false);
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterExperience, setFilterExperience] = useState("");

  const displayed = lawyers.filter(l => {
    if (filterSpecialty && !l.specialties.includes(filterSpecialty)) return false;
    if (filterExperience && l.experienceYears < parseInt(filterExperience)) return false;
    return true;
  });

  useEffect(() => {
    api.get("/marketplace/lawyers").then(({ data }) => setLawyers(data.lawyers)).catch(console.error).finally(() => setInitialLoading(false));
  }, []);

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault(); if (!caseDescription.trim()) return;
    setLoading(true); setIsMatched(false);
    try {
      const { data } = await api.post("/marketplace/match", { caseDescription });
      setLawyers(data.recommendations || []); setIsMatched(true);
    } catch { alert("Failed to find matches. Displaying all lawyers."); }
    finally { setLoading(false); }
  };

  const handleReset = async () => {
    setCaseDescription(""); setIsMatched(false); setLoading(true);
    try { const { data } = await api.get("/marketplace/lawyers"); setLawyers(data.lawyers); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background:"#070b16" }}>
        <div className="w-12 h-12 rounded-2xl animate-spin" style={{ background:"linear-gradient(135deg,#7c6ef7,#d4af37)", boxShadow:"0 0 30px rgba(124,110,247,0.4)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ background:"#070b16", color:"#ededed" }}>
      {/* Orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.div animate={{ scale:[1,1.2,1], opacity:[0.1,0.2,0.1] }} transition={{ duration:14, repeat:Infinity }}
          style={{ position:"absolute", top:"0", left:"-5%", width:"50vw", height:"50vw", background:"#1a2b58", borderRadius:"50%", filter:"blur(150px)" }} />
        <motion.div animate={{ scale:[1,1.3,1], opacity:[0.05,0.12,0.05] }} transition={{ duration:10, repeat:Infinity, delay:5 }}
          style={{ position:"absolute", bottom:"0", right:"-5%", width:"40vw", height:"40vw", background:"#d4af37", borderRadius:"50%", filter:"blur(170px)" }} />
      </div>

      <NyayaNav user={user} logout={logout} active="marketplace" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Back */}
        <button onClick={() => router.push("/")} className="flex items-center gap-1.5 mb-8 text-sm font-medium transition-colors group" style={{ color:"#4a4a62" }}
          onMouseEnter={e => (e.currentTarget.style.color="#a1a1aa")} onMouseLeave={e => (e.currentTarget.style.color="#4a4a62")}>
          <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>

        {/* Hero heading */}
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} className="text-center mb-12">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color:"#7c6ef7" }}>FIND YOUR COUNSEL</p>
          <h1 className={`${playfair.className} text-4xl md:text-5xl font-medium text-white mb-4`}>
            Lawyer <span style={{ color:"#d4af37", fontStyle:"italic" }}>Marketplace</span>
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color:"#6a6a82" }}>
            Find the right legal representation using AI smart matching.
          </p>
        </motion.div>

        {/* AI Match widget */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
          className="rounded-3xl p-6 md:p-8 mb-10 relative overflow-hidden"
          style={{ background:"rgba(13,18,36,0.8)", border:"1px solid rgba(30,38,66,1)", backdropFilter:"blur(12px)" }}>
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background:"linear-gradient(to right, transparent, #7c6ef7, #d4af37, transparent)" }} />
          <motion.div animate={{ opacity:[0.04,0.1,0.04] }} transition={{ duration:5, repeat:Infinity }}
            className="absolute inset-0 pointer-events-none rounded-3xl"
            style={{ background:"radial-gradient(ellipse at top left, rgba(212,175,55,0.08), transparent)" }} />

          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.2)" }}>
              <Sparkles size={18} style={{ color:"#d4af37" }} />
            </div>
            <div>
              <h2 className={`${playfair.className} text-xl text-white font-medium`}>Smart Lawyer Matching</h2>
              <p className="text-sm" style={{ color:"#4a4a62" }}>Describe your case and AI will find your best legal experts.</p>
            </div>
          </div>

          <form onSubmit={handleMatch} className="relative z-10 flex flex-col gap-4">
            <textarea placeholder="E.g., I'm facing a rental dispute where my landlord is withholding my security deposit unlawfully..."
              value={caseDescription} onChange={e => setCaseDescription(e.target.value)}
              className="w-full rounded-2xl px-5 py-4 text-sm resize-none outline-none transition-all"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(30,38,66,1)", color:"#ededed", minHeight:"120px" }}
              onFocus={e => (e.currentTarget.style.borderColor="rgba(212,175,55,0.4)")}
              onBlur={e => (e.currentTarget.style.borderColor="rgba(30,38,66,1)")} />
            <div className="flex gap-3 justify-end">
              {isMatched && (
                <motion.button type="button" onClick={handleReset} whileHover={{ scale:1.03 }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(30,38,66,1)", color:"#a1a1aa" }}>
                  <X size={14} className="inline mr-1" /> Clear Match
                </motion.button>
              )}
              <motion.button type="submit" disabled={loading || !caseDescription.trim()} whileHover={{ boxShadow:"0 0 25px rgba(124,110,247,0.4)" }}
                className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                style={{ background:"linear-gradient(135deg,#7c6ef7,#d4af37)", color:"#070b16" }}>
                {loading ? <div className="w-4 h-4 rounded-full animate-spin border-2 border-[#070b16]/30 border-t-[#070b16]" /> : <><Send size={14} /> Find My Lawyer</>}
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}
            className="rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(30,38,66,1)", color:"#a1a1aa" }}>
            <option value="">All Specialties</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterExperience} onChange={e => setFilterExperience(e.target.value)}
            className="rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(30,38,66,1)", color:"#a1a1aa" }}>
            <option value="">Any Experience</option>
            <option value="5">5+ Years</option>
            <option value="10">10+ Years</option>
            <option value="15">15+ Years</option>
          </select>
        </div>

        {/* Lawyer grid */}
        {initialLoading || loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 rounded-full animate-spin" style={{ border:"3px solid rgba(212,175,55,0.2)", borderTop:"3px solid #d4af37" }} />
            <p className="text-sm font-semibold" style={{ color:"#4a4a62" }}>
              {loading ? "Scanning network for perfect matches..." : "Loading lawyers..."}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayed.length === 0 ? (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                  className="col-span-full py-16 text-center rounded-3xl"
                  style={{ background:"rgba(13,18,36,0.8)", border:"1px solid rgba(30,38,66,1)" }}>
                  <Search size={32} className="mx-auto mb-3" style={{ color:"#4a4a62" }} />
                  <p className="font-semibold text-white mb-1">No lawyers found</p>
                  <p className="text-sm" style={{ color:"#4a4a62" }}>Try adjusting your filters or description.</p>
                </motion.div>
              ) : displayed.map((lawyer, idx) => (
                <motion.div key={lawyer.id}
                  initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} transition={{ delay: 0.05 * idx }}
                  whileHover={{ y:-5, boxShadow:"0 16px 40px rgba(0,0,0,0.4)" }}
                  className="flex flex-col rounded-2xl p-6 relative transition-all"
                  style={{ background:"rgba(13,18,36,0.9)", border: lawyer.matchScore ? "1px solid rgba(212,175,55,0.35)" : "1px solid rgba(30,38,66,1)", backdropFilter:"blur(8px)" }}>
                  {/* Match badge */}
                  {lawyer.matchScore && (
                    <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background:"linear-gradient(135deg,#cfab35,#ece192)", color:"#070b16" }}>
                      {lawyer.matchScore}% AI Match
                    </div>
                  )}

                  {/* Avatar + rating */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                        style={{ background:"linear-gradient(135deg,#7c6ef7,#d4af37)", color:"#070b16" }}>
                        {lawyer.name.split(" ").map(w => w[0]).join("").slice(0,2)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">{lawyer.name}</h3>
                        <div className="flex items-center gap-1 text-xs font-bold" style={{ color:"#d4af37" }}>
                          <Star size={11} className="fill-[#d4af37]" /> {lawyer.rating} / 5.0
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold" style={{ color:"#34d399" }}>₹{lawyer.hourlyRate.toLocaleString()}</div>
                      <div className="text-[10px]" style={{ color:"#4a4a62" }}>per consultation</div>
                    </div>
                  </div>

                  {/* Location/exp */}
                  <div className="flex items-center gap-4 mb-4 text-xs font-medium" style={{ color:"#6a6a82" }}>
                    <span className="flex items-center gap-1"><MapPin size={12} style={{ color:"#f87171" }} />{lawyer.location}</span>
                    <span className="flex items-center gap-1"><Briefcase size={12} style={{ color:"#60a5fa" }} />{lawyer.experienceYears} yrs</span>
                  </div>

                  <p className="text-sm leading-relaxed flex-1 mb-4 line-clamp-3" style={{ color:"#6a6a82" }}>{lawyer.about}</p>

                  {/* Match reason */}
                  {lawyer.matchReason && (
                    <div className="mb-4 p-3 rounded-xl text-xs italic leading-relaxed"
                      style={{ background:"rgba(212,175,55,0.06)", border:"1px solid rgba(212,175,55,0.15)", color:"#d4af37" }}>
                      <span className="font-bold not-italic block mb-1">Why this match?</span>
                      {lawyer.matchReason}
                    </div>
                  )}

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {lawyer.specialties.slice(0,3).map(s => (
                      <span key={s} className="px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wide"
                        style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(30,38,66,1)", color:"#6a6a82" }}>{s}</span>
                    ))}
                    {lawyer.specialties.length > 3 && (
                      <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg" style={{ background:"rgba(255,255,255,0.04)", color:"#4a4a62" }}>
                        +{lawyer.specialties.length - 3}
                      </span>
                    )}
                  </div>

                  <motion.button onClick={() => router.push(`/marketplace/${lawyer.id}`)}
                    whileHover={{ boxShadow:"0 0 20px rgba(212,175,55,0.25)" }}
                    className="w-full py-2.5 rounded-xl text-sm font-bold transition-all mt-auto"
                    style={{ background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.2)", color:"#d4af37" }}>
                    Book Consultation →
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
