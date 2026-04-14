"use client";

import { motion, useScroll, useTransform, AnimatePresence, type Variants } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  Scale, ArrowRight, Shield,
  FileStack, Users, Lock, CheckCircle2,
  Search, Play, Zap, TrendingUp
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Playfair_Display, Inter } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'] });
const inter = Inter({ subsets: ['latin'] });

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: "easeOut" }
  })
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};

// Floating particle component
function Particle({ x, y, size, duration, delay }: { x: number; y: number; size: number; duration: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-[#d4af37]/20 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{
        y: [0, -40, 0],
        x: [0, 15, 0],
        opacity: [0, 0.8, 0],
        scale: [0.5, 1, 0.5],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// Animated counter component
function Counter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) setStarted(true);
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); } 
      else setCount(Math.floor(start));
    }, 25);
    return () => clearInterval(timer);
  }, [started, target]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// Typewriter component
function Typewriter({ words }: { words: string[] }) {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[idx];
    let timeout: NodeJS.Timeout;
    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setIdx((idx + 1) % words.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, deleting, idx, words]);

  return (
    <span className="text-[#d4af37] italic">
      {displayed}
      <span className="inline-block w-[3px] h-[0.85em] bg-[#d4af37] ml-1 align-middle animate-[pulse_0.8s_ease-in-out_infinite]" />
    </span>
  );
}

const particles = Array.from({ length: 18 }, (_, i) => ({
  x: Math.random() * 100, y: Math.random() * 100,
  size: Math.random() * 6 + 2,
  duration: Math.random() * 6 + 5,
  delay: Math.random() * 4,
}));

export default function AdvancedLanding() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Business Law");
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const workflowNodes = [
    { id: 1, title: "Initial Consultation", x: 10, y: 36 },
    { id: 2, title: "Ongoing Legal Support", x: 30, y: 84 },
    { id: 3, title: "Regulatory Compliance", x: 50, y: 100 },
    { id: 4, title: "Contract Review", x: 70, y: 84 },
    { id: 5, title: "Entity Formation", x: 90, y: 36 },
  ];

  const stats = [
    { value: 50000, suffix: "+", label: "Cases Processed", icon: <FileStack size={18} className="text-[#d4af37]" /> },
    { value: 98, suffix: "%", label: "Accuracy Rate", icon: <TrendingUp size={18} className="text-emerald-400" /> },
    { value: 2400, suffix: "+", label: "Verified Lawyers", icon: <Users size={18} className="text-indigo-400" /> },
    { value: 3, suffix: "s", label: "Avg. Analysis Time", icon: <Zap size={18} className="text-rose-400" /> },
  ];

  return (
    <div className={`min-h-screen bg-[#070b16] text-[#ededed] overflow-x-hidden ${inter.className}`}>

      {/* ───────────── NAVBAR ───────────── */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50">
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[rgba(15,20,35,0.4)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-full px-6 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
        >
          <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.05 }}>
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#f2d680] flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
            >
              <Scale className="text-[#070b16]" size={14} />
            </motion.div>
            <span className="text-sm font-bold tracking-widest uppercase text-[#f2d680]">Nyaya AI</span>
          </motion.div>

          <div className="hidden lg:flex items-center gap-8 text-sm text-gray-300">
            {["Platform", "Solutions", "Security", "Pricing"].map((item, i) => (
              <motion.button
                key={item}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                onClick={() => item === "Pricing" && router.push('/pricing')}
                className="hover:text-white transition-colors tracking-wide relative group"
              >
                {item}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#d4af37] group-hover:w-full transition-all duration-300" />
              </motion.button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              onClick={() => router.push('/login')}
              className="hidden md:block text-sm font-medium hover:text-white transition-colors"
            >
              Sign In
            </motion.button>
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(212,175,55,0.5)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/signup')}
              className="bg-[#d4af37] text-[#070b16] px-6 py-2 rounded-full text-sm font-bold tracking-wide shadow-[0_0_15px_rgba(212,175,55,0.2)]"
            >
              Access Portal
            </motion.button>
          </div>
        </motion.div>
      </nav>

      {/* ───────────── HERO ───────────── */}
      <main ref={heroRef} className="relative min-h-screen flex items-center pt-24 pb-12 w-full max-w-7xl mx-auto px-6 lg:px-12 overflow-hidden">

        {/* Floating particles */}
        {particles.map((p, i) => <Particle key={i} {...p} />)}

        {/* Morphing background orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-[#1a2b58] rounded-full mix-blend-screen filter blur-[150px] pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, -20, 0], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] bg-[#d4af37] rounded-full mix-blend-screen filter blur-[200px] pointer-events-none"
        />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-6 items-center relative z-10">

          {/* Hero Content */}
          <div className="flex flex-col items-start pt-20 lg:pt-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="px-4 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase mb-8 flex items-center gap-2"
            >
              <motion.span
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-[#d4af37] inline-block"
              />
              The New Era of Procedural Law
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={`${playfair.className} text-6xl sm:text-7xl lg:text-[7rem] leading-[0.9] text-white font-medium mb-6 drop-shadow-xl tracking-tight`}
            >
              <span className="block">Nyaya</span>
              <span className="block mt-2 min-h-[1.1em]">
                <Typewriter words={["LEGAL AI", "JUSTICE", "YOUR SHIELD", "FOR INDIA"]} />
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="w-full max-w-xl"
            >
              <p className="text-[#a1a1aa] text-lg leading-relaxed mb-10 pl-5 border-l-2 border-[#d4af37]/50 lg:mr-8">
                The ultimate operating system for Indian Law. Automate document intelligence, formulate predictive legal strategy, and navigate complex regulations with military-grade precision.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-5 w-full">
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: "0 0 50px rgba(212,175,55,0.5)" }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push('/signup')}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#cfab35] to-[#ece192] text-[#070b16] px-8 py-4 rounded-full text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-3 group"
                >
                  Start Consultation
                  <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <ArrowRight size={16} />
                  </motion.span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04, backgroundColor: "rgba(255,255,255,0.1)" }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full sm:w-auto px-8 py-4 rounded-full text-sm font-semibold tracking-wider uppercase text-white border border-white/20 flex items-center justify-center gap-3 group"
                >
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Play size={16} className="fill-current" />
                  </motion.span>
                  Watch Demo
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Hero Imagery */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
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
        </motion.div>
      </main>

      {/* ───────────── TRUST STRIP ───────────── */}
      <section className="border-y border-white/5 bg-[#0a0f1d] py-12 relative z-20 overflow-hidden">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="flex gap-20 whitespace-nowrap"
        >
          {[...Array(2)].map((_, rep) => (
            <div key={rep} className="flex items-center gap-20 opacity-30 grayscale">
              <span className="font-bold text-xl tracking-tighter">SUPREME COURT REPORTS</span>
              <span className="text-[#d4af37] font-bold">•</span>
              <span className="font-bold text-xl tracking-tighter">BAR COUNCIL OF INDIA</span>
              <span className="text-[#d4af37] font-bold">•</span>
              <span className="font-bold text-xl tracking-tight">KHAITAN & CO</span>
              <span className="text-[#d4af37] font-bold">•</span>
              <span className="font-bold text-xl tracking-tighter">LAKSHMIKUMARAN & SRIDHARAN</span>
              <span className="text-[#d4af37] font-bold">•</span>
              <span className="font-bold text-xl tracking-tighter">AZB & PARTNERS</span>
              <span className="text-[#d4af37] font-bold">•</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ───────────── STATS ROW ───────────── */}
      <section className="py-20 relative z-20">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto px-6 lg:px-12 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              custom={i}
              variants={fadeUp}
              whileHover={{ y: -6, scale: 1.03 }}
              className="bg-[#0d1224]/80 border border-[#1e2642] rounded-2xl p-6 flex flex-col items-center text-center group hover:border-[#d4af37]/30 transition-all relative overflow-hidden"
            >
              <motion.div
                animate={{ opacity: [0.05, 0.12, 0.05] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"
              />
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 mb-3">{s.icon}</div>
              <div className="text-3xl font-bold text-white mb-1">
                <Counter target={s.value} suffix={s.suffix} />
              </div>
              <div className="text-xs text-[#727581] uppercase tracking-widest">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ───────────── 3D BENTO GRID ───────────── */}
      <section className="py-32 relative z-20 overflow-hidden" style={{ perspective: "2000px" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[60vw] max-h-[800px] bg-gradient-to-r from-[#1e2642]/30 to-[#070b16]/30 blur-[140px] rounded-full pointer-events-none"
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10" style={{ transformStyle: "preserve-3d" }}>
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <motion.h2 custom={0} variants={fadeUp} className={`${playfair.className} text-4xl md:text-5xl text-white mb-6`}>
              An ecosystem designed for profound legal intelligence.
            </motion.h2>
            <motion.p custom={1} variants={fadeUp} className="text-[#a1a1aa] text-lg">
              Nyaya integrates document parsing, generative AI, and a verified practitioner network into a single, cohesive operating environment.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ transformStyle: "preserve-3d" }}>

            {/* Card 1 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              animate={{ y: [0, -8, 0] }}
              whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
              style={{ transformStyle: "preserve-3d" }}
              className="md:col-span-2 bg-[#0d1224]/80 backdrop-blur-xl border border-[#1e2642] rounded-3xl p-10 relative overflow-hidden group hover:border-[#d4af37]/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-colors"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute -top-20 -right-20 w-64 h-64 border border-[#d4af37]/10 rounded-full pointer-events-none"
              />
              <motion.div
                animate={{ rotate: [360, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute -top-10 -right-10 w-40 h-40 border border-[#d4af37]/5 rounded-full pointer-events-none"
              />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#d4af37]/10 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

              <motion.div style={{ transform: "translateZ(40px)" }} className="w-14 h-14 rounded-2xl bg-[#d4af37]/10 flex items-center justify-center mb-6 relative shadow-[0_0_15px_rgba(212,175,55,0.2)] group-hover:bg-[#d4af37]/20 transition-colors">
                <FileStack className="text-[#d4af37]" size={28} />
              </motion.div>
              <h3 className={`${playfair.className} text-3xl text-white mb-4 relative drop-shadow-md`} style={{ transform: "translateZ(60px)" }}>Document Intelligence</h3>
              <p className="text-[#a1a1aa] text-lg max-w-md mb-8 relative" style={{ transform: "translateZ(30px)" }}>Upload massive FIRs, charge sheets, or contracts. Nyaya extracts critical entities, identifies loopholes, and summarizes thousands of pages in seconds.</p>
              <motion.button
                whileHover={{ x: 4 }}
                className="flex items-center gap-2 text-[#d4af37] font-semibold text-sm transition-all relative"
                style={{ transform: "translateZ(50px)" }}
              >
                Explore Pipeline <ArrowRight size={16} />
              </motion.button>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              animate={{ y: [0, -12, 0] }}
              whileHover={{ scale: 1.02, rotateX: -3, rotateY: 3 }}
              style={{ transformStyle: "preserve-3d" }}
              className="bg-[#0d1224]/80 backdrop-blur-xl border border-[#1e2642] rounded-3xl p-10 relative overflow-hidden group hover:border-indigo-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-colors"
            >
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none"
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 relative shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:bg-indigo-500/20 transition-colors" style={{ transform: "translateZ(40px)" }}>
                <Search className="text-indigo-400" size={28} />
              </div>
              <h3 className={`${playfair.className} text-2xl text-white mb-4 relative drop-shadow-md`} style={{ transform: "translateZ(50px)" }}>Global Precedent</h3>
              <p className="text-[#a1a1aa] text-base mb-8 relative" style={{ transform: "translateZ(30px)" }}>Access the entire history of IPC, CrPC, & SC rulings instantly.</p>
              <div className="h-24 w-full bg-[#070b16] border border-[#1e2642] rounded-xl flex items-center px-4 font-mono text-xs text-gray-500 relative shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]" style={{ transform: "translateZ(60px)" }}>
                &gt; Search &quot;fraud bail&quot;<motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="inline-block w-2 h-4 bg-indigo-500 ml-2" />
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              animate={{ y: [0, -10, 0] }}
              whileHover={{ scale: 1.02, rotateX: 3, rotateY: -3 }}
              style={{ transformStyle: "preserve-3d" }}
              className="bg-[#0d1224]/80 backdrop-blur-xl border border-[#1e2642] rounded-3xl p-10 relative overflow-hidden group hover:border-emerald-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-colors"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.06),transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-10 -right-10 w-32 h-32 border border-emerald-500/10 rounded-full pointer-events-none"
              />
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 relative group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.2)]" style={{ transform: "translateZ(40px)" }}>
                <Users className="text-emerald-400" size={28} />
              </div>
              <h3 className={`${playfair.className} text-2xl text-white mb-4 relative drop-shadow-md`} style={{ transform: "translateZ(50px)" }}>Marketplace</h3>
              <p className="text-[#a1a1aa] text-base mb-8 relative" style={{ transform: "translateZ(30px)" }}>Hire Bar-verified advocates based on jurisdiction & expertise instantly.</p>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform pointer-events-none" />
            </motion.div>

            {/* Card 4 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              animate={{ y: [0, -7, 0] }}
              whileHover={{ scale: 1.01, rotateX: -2, rotateY: 2 }}
              style={{ transformStyle: "preserve-3d" }}
              className="md:col-span-2 bg-gradient-to-br from-[#0d1224] to-[#070b16] border border-[#1e2642] rounded-3xl p-10 relative overflow-hidden group hover:border-rose-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center"
            >
              <div className="flex-1 pr-10 relative" style={{ transform: "translateZ(40px)" }}>
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(244,63,94,0.2)] group-hover:scale-110 transition-transform">
                  <Lock className="text-rose-400" size={28} />
                </div>
                <h3 className={`${playfair.className} text-3xl text-white mb-4 drop-shadow-md`} style={{ transform: "translateZ(20px)" }}>E2E Encrypted</h3>
                <p className="text-[#a1a1aa] text-lg max-w-md" style={{ transform: "translateZ(10px)" }}>All documents and chat interactions are AES-256 encrypted natively. Client-attorney privilege, guaranteed.</p>
              </div>
              <div className="hidden md:flex flex-1 justify-center relative h-full items-center min-h-[200px]" style={{ transformStyle: "preserve-3d", transform: "translateZ(80px)" }}>
                <motion.div
                  animate={{ opacity: [0.1, 0.25, 0.1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute w-48 h-48 bg-rose-500/15 blur-[60px] rounded-full pointer-events-none"
                />
                <motion.div
                  animate={{ rotateY: 360, rotateX: [0, 10, -10, 0] }}
                  transition={{ rotateY: { duration: 15, repeat: Infinity, ease: "linear" }, rotateX: { duration: 8, repeat: Infinity, ease: "easeInOut" } }}
                  style={{ transformStyle: "preserve-3d" }}
                  className="relative w-40 h-40 flex items-center justify-center"
                >
                  <div className="absolute inset-0 border border-rose-500/30 rounded-full" style={{ transform: "rotateX(60deg)" }} />
                  <div className="absolute inset-0 border border-blue-500/20 rounded-full" style={{ transform: "rotateY(60deg)" }} />
                  <div className="absolute w-[110%] h-[110%] border border-dashed border-rose-400/10 rounded-full" style={{ transform: "rotateX(75deg)" }} />
                  <Shield className="w-20 h-20 text-rose-400/80 absolute z-10 filter drop-shadow-[0_0_20px_rgba(244,63,94,0.7)]" style={{ transform: "translateZ(30px)" }} />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───────────── WORKFLOW ───────────── */}
      <section className="py-32 bg-[#090b14] border-y border-[#1e2642] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

        <div className="max-w-[90rem] mx-auto px-6 lg:px-12 relative z-10">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
            className="text-center w-full mb-16"
          >
            <motion.h2 custom={0} variants={fadeUp} className={`${playfair.className} text-5xl md:text-6xl text-white mb-6 font-medium`}>Our Workflow</motion.h2>
            <motion.p custom={1} variants={fadeUp} className="text-[#727581] text-sm md:text-base max-w-2xl mx-auto">At Nyaya AI, our workflow is meticulously crafted to ensure seamless and efficient handling of your legal matters.</motion.p>
          </motion.div>

          {/* Tabs */}
          <div className="flex justify-center mb-32 relative z-20">
            <div className="bg-[#101422] p-1.5 flex items-center gap-1 rounded border border-white/5 shadow-2xl">
              {["Business Law", "Litigation", "Real Estate", "Personal Injury"].map((tab) => (
                <motion.button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`px-8 py-3 text-xs md:text-sm font-medium transition-all duration-300 rounded-sm relative ${activeTab === tab ? "text-[#090b14]" : "text-[#727581] hover:text-white"}`}
                >
                  <AnimatePresence>
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-white rounded-sm"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </AnimatePresence>
                  <span className="relative z-10">{tab}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Arc */}
          <div className="relative h-[250px] md:h-[350px] w-full max-w-5xl mx-auto mt-10">
            <svg className="absolute inset-0 w-full h-full pointer-events-none transform scale-y-110" preserveAspectRatio="none" viewBox="0 0 100 100">
              <motion.path
                d="M 0 0 Q 50 200 100 0"
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.2"
                strokeDasharray="4 2"
                initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
              <path d="M 0 20 Q 50 200 100 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.1" />
            </svg>

            {workflowNodes.map((node) => (
              <motion.div
                key={node.id}
                className="absolute flex flex-col items-center justify-center group"
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: node.id * 0.2, type: "spring", stiffness: 200 }}
              >
                <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer pt-6">
                  <motion.div
                    className="relative w-7 h-7 rounded-full bg-[#090b14] border border-[#a1a1aa]/30 flex items-center justify-center shadow-lg z-10"
                    whileHover={{ scale: 1.4, borderColor: "rgba(255,255,255,0.8)" }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border border-dashed border-white/30"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: node.id * 0.4 }}
                      className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]"
                    />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: node.id * 0.4 }}
                    className="absolute top-[28px] left-[50%] -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/20"
                  />
                  <div className="mt-4 text-center w-[120px]">
                    <span className="text-[#a1a1aa] text-xs font-medium tracking-wide group-hover:text-white transition-colors">{node.title}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-32 md:mt-40 flex justify-center relative z-20"
          >
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(167,243,208,0.2)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-stretch overflow-hidden rounded-[0.5rem] border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] group"
            >
              <div className="bg-[#242730] px-6 py-4 text-white text-xl md:text-2xl font-bold flex items-center justify-center border-r border-[#1e2642]">W.</div>
              <div className="bg-[#a7f3d0] px-8 py-4 text-[#064e3b] font-bold text-xs md:text-sm tracking-widest uppercase flex items-center justify-center group-hover:bg-[#86efac] transition-colors">Visit Resource</div>
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ───────────── PRICING ───────────── */}
      <section className="py-32 relative overflow-hidden">
        <motion.div
          animate={{ x: ["-20%", "20%", "-20%"], y: ["0%", "10%", "0%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-0 w-[40vw] h-[40vw] bg-[#d4af37]/5 blur-[150px] rounded-full pointer-events-none"
        />
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <motion.h2 custom={0} variants={fadeUp} className={`${playfair.className} text-4xl md:text-5xl text-white mb-6`}>Transparent, scalable access.</motion.h2>
            <motion.p custom={1} variants={fadeUp} className="text-[#a1a1aa] text-lg">For individuals fighting for rights, to mega-firms managing thousands of dossiers.</motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.7 }}
              whileHover={{ y: -8, borderColor: "rgba(212,175,55,0.3)" }}
              className="bg-[#0a0f1d] border border-[#1e2642] rounded-3xl p-8 flex flex-col transition-colors"
            >
              <h4 className="text-xl font-semibold text-white mb-2">Basic Rights</h4>
              <p className="text-sm text-[#a1a1aa] mb-6">For citizens exploring their legal standing.</p>
              <div className="text-4xl font-bold text-white mb-8">₹0 <span className="text-base font-normal text-gray-500">/mo</span></div>
              <ul className="space-y-4 mb-10 flex-1">
                {["Access to Base AI Chat", "1 Document Parse / Month", "Public Case Search"].map((f, i) => (
                  <motion.li key={f} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 size={16} className="text-[#d4af37] shrink-0" /> {f}
                  </motion.li>
                ))}
              </ul>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => router.push('/signup')} className="w-full py-3 rounded-full border border-[#1e2642] text-white hover:bg-[#1e2642] transition-colors">Get Started</motion.button>
            </motion.div>

            {/* Pro */}
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}
              whileHover={{ y: -12 }}
              className="bg-gradient-to-b from-[#0d1633] to-[#0a0f1d] border-2 border-[#d4af37]/50 rounded-3xl p-8 flex flex-col relative transform md:-translate-y-4 shadow-[0_20px_50px_rgba(212,175,55,0.15)]"
            >
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#d4af37] text-black text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full"
              >
                Most Popular
              </motion.div>
              <motion.div
                animate={{ opacity: [0.05, 0.12, 0.05] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.1),transparent)] pointer-events-none rounded-3xl"
              />
              <h4 className="text-xl font-semibold text-[#f2d680] mb-2">Nyaya PRO</h4>
              <p className="text-sm text-[#a1a1aa] mb-6">For power users and independent practitioners.</p>
              <div className="text-4xl font-bold text-white mb-8">₹1,999 <span className="text-base font-normal text-gray-500">/mo</span></div>
              <ul className="space-y-4 mb-10 flex-1">
                {["Unlimited AI (GPT-4o)", "500 Document Parses / Month", "Case Management Module", "Priority Lawyer Matching"].map((f, i) => (
                  <motion.li key={f} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 size={16} className="text-[#d4af37] shrink-0" /> {f}
                  </motion.li>
                ))}
              </ul>
              <motion.button whileHover={{ scale: 1.03, boxShadow: "0 0 25px rgba(212,175,55,0.5)" }} whileTap={{ scale: 0.97 }} onClick={() => router.push('/signup')} className="w-full py-3 rounded-full bg-[#d4af37] text-black font-bold transition-all">Upgrade to PRO</motion.button>
            </motion.div>

            {/* Enterprise */}
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }}
              whileHover={{ y: -8, borderColor: "rgba(212,175,55,0.3)" }}
              className="bg-[#0a0f1d] border border-[#1e2642] rounded-3xl p-8 flex flex-col transition-colors"
            >
              <h4 className="text-xl font-semibold text-white mb-2">Law Firm Enterprise</h4>
              <p className="text-sm text-[#a1a1aa] mb-6">Custom deployment for massive organizations.</p>
              <div className="text-4xl font-bold text-white mb-8">Custom</div>
              <ul className="space-y-4 mb-10 flex-1">
                {["Unlimited Everything", "Dedicated Secure Server", "Custom Model Fine-tuning"].map((f, i) => (
                  <motion.li key={f} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 size={16} className="text-gray-500 shrink-0" /> {f}
                  </motion.li>
                ))}
              </ul>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="w-full py-3 rounded-full border border-[#1e2642] text-white hover:bg-[#1e2642] transition-colors">Contact Sales</motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───────────── CTA + FOOTER ───────────── */}
      <footer className="bg-[#04070e] pt-24 pb-12 border-t border-[#1e2642] relative overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.12, 0.05] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4af37] blur-[150px] rounded-full pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 10, repeat: Infinity, delay: 4 }}
          className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500 blur-[150px] rounded-full pointer-events-none"
        />
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={staggerContainer}
            className="flex flex-col items-center text-center mb-24"
          >
            <motion.h2 custom={0} variants={fadeUp} className={`${playfair.className} text-5xl md:text-6xl text-white mb-8`}>
              Justice delayed<br />
              <span className="text-[#d4af37] italic">is justice denied.</span>
            </motion.h2>
            <motion.div custom={1} variants={fadeUp}>
              <motion.button
                whileHover={{ scale: 1.06, boxShadow: "0 0 50px rgba(255,255,255,0.3)" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push('/signup')}
                className="bg-white text-[#070b16] px-10 py-4 rounded-full text-sm font-bold tracking-wider uppercase shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                Enter The Portal
              </motion.button>
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 border-t border-[#1e2642] pt-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Scale className="text-[#d4af37]" size={20} />
                <span className="text-sm font-bold tracking-widest uppercase text-white">Nyaya AI</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs">The intelligent legal operating system defining the future of jurisdiction and procedural law in India.</p>
            </div>
            {[
              { title: "Product", links: ["Intelligence Platform", "Lawyer Network", "Enterprise API", "Pricing"] },
              { title: "Resources", links: ["Documentation", "Legal Blog", "Case Studies", "Help Center"] },
              { title: "Company", links: ["About Us", "Careers", "Privacy Policy", "Terms of Service"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-white font-semibold mb-6">{col.title}</h4>
                <ul className="space-y-4 text-sm text-gray-500">
                  {col.links.map((l) => (
                    <li key={l}>
                      <motion.button whileHover={{ x: 4, color: "#d4af37" }} className="hover:text-[#d4af37] transition-colors">{l}</motion.button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-16 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} Nyaya Technologies Pvt Ltd. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
