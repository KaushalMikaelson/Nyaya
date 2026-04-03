"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, Filter, BookOpen, Bot, ArrowLeft, Gavel } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

type LegalChunk = {
  id: string;
  content: string;
  act?: { shortName: string; title: string; year: number };
  section?: { number: string; title: string };
  clause?: { number: string };
  score?: number;
};

export default function SearchPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LegalChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Filters
  const [filterAct, setFilterAct] = useState("All Acts");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterCourt, setFilterCourt] = useState("All Courts");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setHasSearched(true);
    try {
      const { data } = await api.post("/search", { 
        query, 
        filters: {
          act: filterAct,
          category: filterCategory,
          court: filterCourt
        } 
      });
      setResults(data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const askAi = (chunk: LegalChunk) => {
    let focus = ``;
    if (chunk.act) focus += `${chunk.act.shortName} `;
    if (chunk.section) focus += `Sec ${chunk.section.number} `;
    const prompt = `Can you explain this law in simple terms? ${focus}: "${chunk.content}"`;
    router.push(`/?prompt=${encodeURIComponent(prompt)}`);
  };

  if (authLoading) return <div className="min-h-screen" style={{ background: "#07070d" }} />;

  return (
    <div className="min-h-screen w-full flex flex-col items-center" style={{ background: "#07070d", color: "#f1f1f5" }}>
      
      {/* Navbar */}
      <header className="w-full h-16 flex items-center justify-between px-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(14,14,24,0.7)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="p-2 rounded-xl transition-colors" style={{ background: 'rgba(255,255,255,0.03)' }} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}>
            <ArrowLeft size={18} style={{ color: '#a855f7' }} />
          </button>
          <div className="flex items-center gap-2">
            <Gavel size={20} style={{ color: '#7c6ef7' }} />
            <h1 className="font-semibold tracking-wide text-lg">Legal Search Engine</h1>
          </div>
        </div>
        <div className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(124,110,247,0.15)", color: "#9d8fff", border: "1px solid rgba(124,110,247,0.25)" }}>
          PHASE 2
        </div>
      </header>

      {/* Main Search Area */}
      <main className={`w-full max-w-4xl px-4 transition-all duration-700 ease-in-out ${hasSearched ? 'pt-8' : 'pt-40'}`}>
        
        {!hasSearched && (
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold mb-4 tracking-tight">Search the <span className="gradient-text">Indian Law</span></h2>
            <p className="text-sm" style={{ color: '#6a6a80' }}>
              Instantly find relevant acts, sections, and clauses utilizing Hybrid Semantic Vector search.
            </p>
          </div>
        )}

        <form onSubmit={handleSearch} className="relative w-full z-20">
          <div className="relative flex items-center justify-center shadow-2xl">
            <SearchIcon size={20} className="absolute left-5 pointer-events-none transition-colors" style={{ color: query ? '#9d8fff' : '#4a4a62' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Penalty for sedition..."
              className="w-full py-4 pl-14 pr-32 rounded-2xl outline-none text-base transition-all bg-opacity-70 backdrop-blur-lg"
              style={{ background: '#0e0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,110,247,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,110,247,0.1)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, #7c6ef7, #a855f7)', color: 'white' }}
            >
              {loading ? <span className="animate-pulse">Searching...</span> : 'Search'}
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 mt-4 justify-center">
            <Filter size={14} style={{ color: '#5a5a70' }} />
            <select value={filterAct} onChange={(e) => setFilterAct(e.target.value)} className="bg-transparent text-xs outline-none cursor-pointer rounded-lg px-2 py-1.5 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#8a8a9e' }}>
              <option value="All Acts">All Acts</option>
              <option value="Constitution">Constitution</option>
              <option value="BNS">BNS (Criminal Code)</option>
              <option value="BNSS">BNSS (Procedure)</option>
              <option value="IT Act">Information Tech</option>
              <option value="Consumer Act">Consumer Protection</option>
            </select>
            
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-transparent text-xs outline-none cursor-pointer rounded-lg px-2 py-1.5 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#8a8a9e' }}>
              <option value="All Categories">All Categories</option>
              <option value="Civil Law">Civil Law</option>
              <option value="Criminal Law">Criminal Law</option>
              <option value="Corporate Law">Corporate Law</option>
            </select>

            <select value={filterCourt} onChange={(e) => setFilterCourt(e.target.value)} className="bg-transparent text-xs outline-none cursor-pointer rounded-lg px-2 py-1.5 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#8a8a9e' }}>
              <option value="All Courts">All Courts</option>
              <option value="Supreme Court">Supreme Court</option>
              <option value="High Court">High Court</option>
              <option value="District Court">District Court</option>
            </select>
          </div>
        </form>

        {/* Results */}
        <div className="mt-10 pb-20 space-y-4">
          <AnimatePresence>
            {results.map((chunk, index) => (
              <motion.div
                key={chunk.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-5 rounded-2xl relative overflow-hidden group"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen size={14} style={{ color: '#a855f7' }} />
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#7c6ef7' }}>
                        {chunk.act ? `${chunk.act.shortName} ${chunk.act.year}` : 'Legal Text'}
                      </span>
                      {chunk.section && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', color: '#a0a0bd' }}>
                          Sec {chunk.section.number}
                        </span>
                      )}
                      {chunk.clause && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', color: '#a0a0bd' }}>
                          Cl {chunk.clause.number}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-sm font-medium mb-2 text-white">
                      {chunk.section?.title || 'Legal Provision'}
                    </h3>
                    
                    <p className="text-sm leading-relaxed" style={{ color: '#b0b0c0' }}>
                      &quot;{chunk.content}&quot;
                    </p>
                  </div>

                  <button
                    onClick={() => askAi(chunk)}
                    className="flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                    style={{ background: 'rgba(124,110,247,0.1)', color: '#a855f7', border: '1px solid rgba(124,110,247,0.2)' }}
                  >
                    <Bot size={14} />
                    <span className="hidden sm:inline">Ask AI</span>
                  </button>
                </div>
              </motion.div>
            ))}
            
            {hasSearched && results.length === 0 && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <p style={{ color: '#5a5a70' }}>No legal texts found for your query. Try altering your keywords or filters.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
