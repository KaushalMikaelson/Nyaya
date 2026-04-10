"use client";

import { motion } from "framer-motion";
import { 
  Scale, ArrowRight, Shield, Globe, Award, ChevronRight, 
  FileStack, Users, Zap, Briefcase, Lock, CheckCircle2,
  TrendingUp, Building2, Search, Play
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Playfair_Display, Inter } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'] });
const inter = Inter({ subsets: ['latin'] });

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

export default function AdvancedLanding() {
  const router = useRouter();

  return (
    <div className={`min-h-screen bg-[#070b16] text-[#ededed] overflow-x-hidden ${inter.className}`}>
      
      {/* Floating Glass Navbar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-[rgba(15,20,35,0.4)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-full px-6 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#f2d680] flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
               <Scale className="text-[#070b16]" />
             </div>
             <span className="text-sm font-bold tracking-widest uppercase text-[#f2d680]">Nyaay AI</span>
          </div>

          <div className="hidden lg:flex items-center gap-8 text-sm text-gray-300">
            <button className="hover:text-white transition-colors tracking-wide">Platform</button>
            <button className="hover:text-white transition-colors tracking-wide">Solutions</button>
            <button className="hover:text-white transition-colors tracking-wide">Security</button>
            <button className="hover:text-white transition-colors tracking-wide">Pricing</button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/login')} className="hidden md:block text-sm font-medium hover:text-white transition-colors">
              Sign In
            </button>
            <button 
              onClick={() => router.push('/signup')}
              className="bg-[#d4af37] text-[#070b16] hover:bg-[#f2d680] transition-colors px-6 py-2 rounded-full text-sm font-bold tracking-wide shadow-[0_0_15px_rgba(212,175,55,0.2)]"
            >
              Access Portal
            </button>
          </div>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="relative min-h-screen flex items-center pt-24 pb-12 w-full max-w-7xl mx-auto px-6 lg:px-12">
        
        {/* Abstract Background Accents */}
        <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-[#1a2b58] rounded-full mix-blend-screen filter blur-[150px] opacity-30 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] bg-[#d4af37] rounded-full mix-blend-screen filter blur-[200px] opacity-[0.08] pointer-events-none" />

        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-6 items-center relative z-10">
          
          {/* Hero Content */}
          <div className="flex flex-col items-start pt-20 lg:pt-0">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.1 }}
               className="px-4 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase mb-8"
             >
               The New Era of Procedural Law
             </motion.div>
             
             <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.3 }} className="w-full">
               <h1 className={`${playfair.className} text-6xl sm:text-7xl lg:text-[7rem] leading-[0.9] text-white font-medium mb-6 drop-shadow-xl tracking-tight`}>
                 <span className="block">NYAAY</span>
                 <span className="block text-[#d4af37] italic mt-2">LEGAL AI</span>
               </h1>
             </motion.div>

             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} className="w-full max-w-xl">
                <p className="text-[#a1a1aa] text-lg leading-relaxed mb-10 pl-5 border-l-2 border-[#d4af37]/50 lg:mr-8">
                  The ultimate operating system for Indian Law. Automate document intelligence, formulate predictive legal strategy, and navigate complex regulations with military-grade precision.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-5 w-full">
                  <button 
                    onClick={() => router.push('/signup')} 
                    className="w-full sm:w-auto bg-gradient-to-r from-[#cfab35] to-[#ece192] text-[#070b16] px-8 py-4 rounded-full text-sm font-bold tracking-wider uppercase hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-3 group"
                  >
                    Start Consultation <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button className="w-full sm:w-auto px-8 py-4 rounded-full text-sm font-semibold tracking-wider uppercase text-white border border-white/20 hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                    <Play size={16} className="fill-current" /> Watch Demo
                  </button>
                </div>
             </motion.div>
          </div>

          {/* Hero Imagery */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
            className="relative lg:h-[85vh] min-h-[400px] flex items-center justify-center z-0"
          >
             <div className="relative w-full h-full min-h-[400px] lg:scale-[1.3] transform translate-x-4 lg:translate-x-10 translate-y-4 lg:translate-y-12 pointer-events-none">
                 <Image 
                   src="/hero_justice_statue.png" 
                   alt="Lady Justice Gold Statue" 
                   fill 
                   className="object-contain object-right-bottom drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" 
                   priority
                 />
             </div>
             
             <div className="absolute inset-y-0 right-0 w-2/3 bg-gradient-to-l from-[#070b16] via-[#070b16]/40 to-transparent z-10 pointer-events-none" />
             <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-[#070b16] via-[#070b16]/60 to-transparent z-10 pointer-events-none" />
          </motion.div>

        </div>
      </main>

      {/* Feature Strip (Logos / Core Trust) */}
      <section className="border-y border-white/5 bg-[#0a0f1d] py-12 relative z-20">
         <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-4 text-gray-500 font-semibold tracking-widest uppercase text-xs">
              <Shield size={16} className="text-[#d4af37]" /> Trusted by top Indian Law Firms
            </div>
            <div className="flex items-center gap-10 opacity-40 grayscale">
              <span className="font-bold text-xl tracking-tighter">SUPREME COURT REPORTS</span>
              <span className="font-bold text-xl tracking-tighter">BAR COUNCIL OF INDIA</span>
              <span className="font-bold text-xl tracking-tight">KHAITAN & CO</span>
            </div>
         </div>
      </section>

      {/* Architecture Bento Grid Section */}
      <section className="py-32 relative z-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn} className="text-center max-w-3xl mx-auto mb-20">
            <h2 className={`${playfair.className} text-4xl md:text-5xl text-white mb-6`}>An ecosystem designed for profound legal intelligence.</h2>
            <p className="text-[#a1a1aa] text-lg">Nyaay integrates document parsing, generative AI, and a verified practitioner network into a single, cohesive operating environment.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bento 1: Document Intelligence */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="md:col-span-2 bg-[#0d1224] border border-[#1e2642] rounded-3xl p-10 relative overflow-hidden group hover:border-[#d4af37]/30 transition-colors">
               <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity"><FileStack size={180} /></div>
               <div className="w-14 h-14 rounded-2xl bg-[#d4af37]/10 flex items-center justify-center mb-6">
                 <FileStack className="text-[#d4af37]" size={28} />
               </div>
               <h3 className={`${playfair.className} text-3xl text-white mb-4`}>Document Intelligence</h3>
               <p className="text-[#a1a1aa] text-lg max-w-md mb-8">Upload massive FIRs, charge sheets, or contracts. Nyaay extracts critical entities, identifies loopholes, and summarizes thousands of pages in seconds.</p>
               <button className="flex items-center gap-2 text-[#d4af37] font-semibold text-sm hover:gap-4 transition-all">Explore Pipeline <ArrowRight size={16} /></button>
            </motion.div>

            {/* Bento 2: Automated Search */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="bg-[#0d1224] border border-[#1e2642] rounded-3xl p-10 relative overflow-hidden group hover:border-[#d4af37]/30 transition-colors">
               <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
                 <Search className="text-indigo-400" size={28} />
               </div>
               <h3 className={`${playfair.className} text-2xl text-white mb-4`}>Global Precedent Search</h3>
               <p className="text-[#a1a1aa] text-base mb-8">Access the entire history of IPC, CrPC, and Supreme Court rulings instantly through natural language queries.</p>
               <div className="mt-auto h-24 w-full bg-[#070b16] border border-[#1e2642] rounded-xl flex items-center px-4 font-mono text-xs text-gray-500">
                 &gt; Search &quot;bail in property fraud&quot;...<span className="w-2 h-4 bg-indigo-500 animate-pulse ml-2" />
               </div>
            </motion.div>

            {/* Bento 3: Verified Network */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="bg-[#0d1224] border border-[#1e2642] rounded-3xl p-10 relative overflow-hidden group hover:border-[#d4af37]/30 transition-colors">
               <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                 <Users className="text-emerald-400" size={28} />
               </div>
               <h3 className={`${playfair.className} text-2xl text-white mb-4`}>Marketplace</h3>
               <p className="text-[#a1a1aa] text-base mb-8">Once AI strategy is formed, instantly hire Bar-Council verified advocates based on precise jurisdiction and expertise mapping.</p>
            </motion.div>

            {/* Bento 4: Absolute Security */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="md:col-span-2 bg-gradient-to-br from-[#0d1224] to-[#070b16] border border-[#1e2642] rounded-3xl p-10 relative overflow-hidden group hover:border-[#d4af37]/30 transition-colors flex items-center">
               <div className="flex-1 pr-10">
                 <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6">
                   <Lock className="text-rose-400" size={28} />
                 </div>
                 <h3 className={`${playfair.className} text-3xl text-white mb-4`}>E2E Encrypted Submissions</h3>
                 <p className="text-[#a1a1aa] text-lg max-w-md">Client-attorney privilege matters. All documents and chat interactions are AES-256 encrypted, ensuring complete anonymity and legal compliance.</p>
               </div>
               <div className="hidden md:flex flex-1 justify-center relative">
                 <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full" />
                 <Shield className="w-48 h-48 text-[#1e2642] opacity-50 relative z-10" />
                 <Shield className="w-48 h-48 text-rose-500/10 absolute z-0 animate-pulse" />
               </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Workflow Timeline Section */}
      <section className="py-24 bg-[#0a0f1d] border-y border-[#1e2642]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className={`${playfair.className} text-4xl text-white mb-4`}>From query to courtroom in three steps.</h2>
            <p className="text-[#a1a1aa]">We streamline the paralyzing complexity of the Indian legal system.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
             <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
             
             {/* Step 1 */}
             <div className="relative flex flex-col items-center text-center">
               <div className="w-14 h-14 rounded-full bg-[#070b16] border-2 border-[#1e2642] flex items-center justify-center text-xl font-bold text-[#d4af37] mb-6 z-10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">1</div>
               <h4 className="text-xl font-semibold mb-3 text-white">Ask Nyaay AI</h4>
               <p className="text-[#a1a1aa] text-sm leading-relaxed px-4">Input your legal issue in native languages. Our LLM parses the facts and generates a preliminary legal strategy backed by citations.</p>
             </div>

             {/* Step 2 */}
             <div className="relative flex flex-col items-center text-center">
               <div className="w-14 h-14 rounded-full bg-[#0d1224] border-2 border-[#d4af37] flex items-center justify-center text-xl font-bold text-[#d4af37] mb-6 z-10 shadow-[0_0_30px_rgba(212,175,55,0.2)]">2</div>
               <h4 className="text-xl font-semibold mb-3 text-white">Analyze Evidence</h4>
               <p className="text-[#a1a1aa] text-sm leading-relaxed px-4">Upload contracts, FIRs, or evidence. Nyaay extracts entities and checks for procedural loopholes or breaches of contract instantly.</p>
             </div>

             {/* Step 3 */}
             <div className="relative flex flex-col items-center text-center">
               <div className="w-14 h-14 rounded-full bg-[#070b16] border-2 border-[#1e2642] flex items-center justify-center text-xl font-bold text-[#d4af37] mb-6 z-10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">3</div>
               <h4 className="text-xl font-semibold mb-3 text-white">Retain Counsel</h4>
               <p className="text-[#a1a1aa] text-sm leading-relaxed px-4">Sync your case file to a verified Lawyer matching your jurisdiction and let them take the matter into court immediately.</p>
             </div>
          </div>
        </div>
      </section>

      {/* Pricing / Tiers */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className={`${playfair.className} text-4xl md:text-5xl text-white mb-6`}>Transparent, scalable access.</h2>
            <p className="text-[#a1a1aa] text-lg">For individuals fighting for rights, to mega-firms managing thousands of dossiers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-[#0a0f1d] border border-[#1e2642] rounded-3xl p-8 flex flex-col">
              <h4 className="text-xl font-semibold text-white mb-2">Basic Rights</h4>
              <p className="text-sm text-[#a1a1aa] mb-6">For citizens exploring their legal standing.</p>
              <div className="text-4xl font-bold text-white mb-8">₹0 <span className="text-base font-normal text-gray-500">/mo</span></div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> Access to Base AI Chat</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> 1 Document Parse / Month</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> Public Case Search</li>
              </ul>
              <button 
                onClick={() => router.push('/signup')}
                className="w-full py-3 rounded-full border border-[#1e2642] text-white hover:bg-[#1e2642] transition-colors"
               >
                Get Started
              </button>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-b from-[#0d1633] to-[#0a0f1d] border-2 border-[#d4af37]/50 rounded-3xl p-8 flex flex-col relative transform md:-translate-y-4 shadow-[0_20px_50px_rgba(212,175,55,0.1)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#d4af37] text-black text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full">Most Popular</div>
              <h4 className="text-xl font-semibold text-[#f2d680] mb-2">Nyaay PRO</h4>
              <p className="text-sm text-[#a1a1aa] mb-6">For power users and independent practitioners.</p>
              <div className="text-4xl font-bold text-white mb-8">₹1,999 <span className="text-base font-normal text-gray-500">/mo</span></div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> Unlimited AI Intelligence (GPT-4o)</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> 500 Document Parses / Month</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> Case Management Module</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> Priority Lawyer Matching</li>
              </ul>
              <button 
                onClick={() => router.push('/signup')}
                className="w-full py-3 rounded-full bg-[#d4af37] text-black font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all"
               >
                Upgrade to PRO
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-[#0a0f1d] border border-[#1e2642] rounded-3xl p-8 flex flex-col">
              <h4 className="text-xl font-semibold text-white mb-2">Law Firm Enterprise</h4>
              <p className="text-sm text-[#a1a1aa] mb-6">Custom deployment for massive organizations.</p>
              <div className="text-4xl font-bold text-white mb-8">Custom</div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-gray-500" /> Unlimited Everything</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-gray-500" /> Dedicated Secure Server</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-gray-500" /> Custom Model Fine-tuning</li>
              </ul>
              <button className="w-full py-3 rounded-full border border-[#1e2642] text-white hover:bg-[#1e2642] transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA & Footer */}
      <footer className="bg-[#04070e] pt-24 pb-12 border-t border-[#1e2642] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4af37]/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          
          <div className="flex flex-col items-center text-center mb-24">
             <h2 className={`${playfair.className} text-5xl md:text-6xl text-white mb-8`}>Justice delayed<br/><span className="text-[#d4af37] italic">is justice denied.</span></h2>
             <button onClick={() => router.push('/signup')} className="bg-white text-[#070b16] px-10 py-4 rounded-full text-sm font-bold tracking-wider uppercase hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]">
               Enter The Portal
             </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 border-t border-[#1e2642] pt-12">
             <div>
                <div className="flex items-center gap-2 mb-6">
                  <Scale className="text-[#d4af37]" size={20} />
                  <span className="text-sm font-bold tracking-widest uppercase text-white">Nyaay AI</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed max-w-xs">The intelligent legal operating system defining the future of jurisdiction and procedural law in India.</p>
             </div>
             <div>
               <h4 className="text-white font-semibold mb-6">Product</h4>
               <ul className="space-y-4 text-sm text-gray-500">
                 <li><button className="hover:text-[#d4af37] transition-colors">Intelligence Platform</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Lawyer Network</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Enterprise API</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Pricing</button></li>
               </ul>
             </div>
             <div>
               <h4 className="text-white font-semibold mb-6">Resources</h4>
               <ul className="space-y-4 text-sm text-gray-500">
                 <li><button className="hover:text-[#d4af37] transition-colors">Documentation</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Legal Blog</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Case Studies</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Help Center</button></li>
               </ul>
             </div>
             <div>
               <h4 className="text-white font-semibold mb-6">Company</h4>
               <ul className="space-y-4 text-sm text-gray-500">
                 <li><button className="hover:text-[#d4af37] transition-colors">About Us</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Careers</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Privacy Policy</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Terms of Service</button></li>
               </ul>
             </div>
          </div>
          
          <div className="mt-16 text-center text-xs text-gray-600">
             © {new Date().getFullYear()} Nyaay Technologies Pvt Ltd. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
