'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Star, MapPin, Briefcase, Search, ArrowLeft, Send } from 'lucide-react';
import api from '@/lib/api';

interface Lawyer {
  id: string;
  name: string;
  specialties: string[];
  experienceYears: number;
  location: string;
  rating: number;
  hourlyRate: number;
  about: string;
  matchScore?: number;
  matchReason?: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [caseDescription, setCaseDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMatched, setIsMatched] = useState(false);

  useEffect(() => {
    // Load all lawyers initially
    const fetchLawyers = async () => {
      try {
        const { data } = await api.get('/marketplace/lawyers');
        setLawyers(data.lawyers);
      } catch (err) {
        console.error("Failed to fetch lawyers list:", err);
      }
    };
    fetchLawyers();
  }, []);

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseDescription.trim()) return;

    setLoading(true);
    setIsMatched(false);
    try {
      const { data } = await api.post('/marketplace/match', { caseDescription });
      setLawyers(data.recommendations || []);
      setIsMatched(true);
    } catch (error) {
      console.error("Failed to match lawyers:", error);
      alert("Failed to find appropriate matches. Displaying all lawyers.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setCaseDescription('');
    setIsMatched(false);
    setLoading(true);
    try {
      const { data } = await api.get('/marketplace/lawyers');
      setLawyers(data.lawyers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12 font-sans selection:bg-amber-500/30">
      <div className="max-w-6xl mx-auto">
        
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Lawyer <span className="text-amber-500">Marketplace</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Find the right legal representation for your case using AI smart matching.
          </p>
        </motion.div>

        {/* AI Matching Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl mb-12 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600"></div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Search className="text-amber-500" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Smart Lawyer Matchings</h2>
              <p className="text-sm text-slate-400">Describe your case below and we&apos;ll match you with the best legal top-tier experts.</p>
            </div>
          </div>

          <form onSubmit={handleMatch} className="flex flex-col gap-4">
            <textarea
              placeholder="E.g., I'm facing a rental dispute with my landlord where they are withholding my security deposit unlawfully..."
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 min-h-[120px] resize-y"
            ></textarea>
            
            <div className="flex gap-4 justify-end">
              {isMatched && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-semibold"
                >
                  Clear Match
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !caseDescription.trim()}
                className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition-colors font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                ) : (
                  <>
                    <Send size={18} />
                    Find My Lawyer
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Lawyer Roster */}
        {loading ? (
           <div className="py-20 text-center flex flex-col justify-center items-center gap-4">
              <div className="animate-spin w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full"></div>
              <p className="text-amber-500/80 font-medium">Scanning network for perfect matches...</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lawyers.map((lawyer, idx) => (
              <motion.div
                key={lawyer.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * idx }}
                className={`bg-[#0d0d16] border ${lawyer.matchScore ? 'border-amber-500/40 relative' : 'border-slate-800'} rounded-2xl p-6 shadow-xl flex flex-col`}
              >
                {/* Match Badge */}
                {lawyer.matchScore && (
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-amber-300/20">
                    {lawyer.matchScore}% AI Match
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{lawyer.name}</h3>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-amber-500">
                      <Star fill="currentColor" size={14} />
                      {lawyer.rating} / 5.0
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">₹{lawyer.hourlyRate.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">per consultation</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5"><MapPin size={14} className="text-rose-400"/> {lawyer.location}</span>
                  <span className="flex items-center gap-1.5"><Briefcase size={14} className="text-blue-400"/> {lawyer.experienceYears} Years Exp.</span>
                </div>

                <p className="text-sm text-slate-400 mb-5 leading-relaxed line-clamp-3 flex-1">
                  {lawyer.about}
                </p>

                {lawyer.matchReason && (
                   <div className="mb-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500/90 leading-relaxed italic">
                     <span className="font-semibold block mb-1">Why this match?</span>
                     {lawyer.matchReason}
                   </div>
                )}

                <div className="mb-6 flex flex-wrap gap-2">
                  {lawyer.specialties.slice(0,3).map(s => (
                    <span key={s} className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800/80 text-slate-300">
                      {s}
                    </span>
                  ))}
                  {lawyer.specialties.length > 3 && (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800/80 text-slate-500">
                      +{lawyer.specialties.length - 3}
                    </span>
                  )}
                </div>

                <button className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-amber-600 hover:border-amber-500 hover:text-white transition-colors text-sm font-bold text-slate-300 mt-auto">
                  Book Consultation
                </button>
              </motion.div>
            ))}

            {lawyers.length === 0 && !loading && (
               <div className="col-span-full py-12 text-center text-slate-500">
                 No verified lawyers found matching that criteria. Try adjusting your description.
               </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
