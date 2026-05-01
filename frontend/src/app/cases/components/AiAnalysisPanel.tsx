"use client";

import { motion } from "framer-motion";
import { AiAnalysis } from "../hooks/useCaseForm";

const RISK_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  LOW:      { color: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)"  },
  MEDIUM:   { color: "#facc15", bg: "rgba(250,204,21,0.08)",  border: "rgba(250,204,21,0.2)"  },
  HIGH:     { color: "#fb923c", bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.2)"  },
  CRITICAL: { color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
};

export function AiAnalysisPanel({ result }: { result: AiAnalysis }) {
  const risk = RISK_COLORS[result.riskLevel] ?? RISK_COLORS.MEDIUM;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-5 rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(124,110,247,0.2)", background: "rgba(124,110,247,0.04)" }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center gap-2.5"
        style={{ background: "rgba(124,110,247,0.08)", borderBottom: "1px solid rgba(124,110,247,0.12)" }}>
        <span className="text-base">✨</span>
        <p className="text-sm font-bold" style={{ color: "#9d8fff" }}>Nyaya AI Analysis</p>
        <span className="ml-auto px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
          style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}>
          {result.riskLevel} RISK
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Summary */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#7c6ef7" }}>📝 Case Summary</p>
          <p className="text-sm leading-relaxed" style={{ color: "#c4c4d4" }}>{result.summary}</p>
        </div>

        {/* Risk reason */}
        {result.riskReason && (
          <div className="rounded-xl p-3" style={{ background: risk.bg, border: `1px solid ${risk.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: risk.color }}>⚠️ Risk Assessment</p>
            <p className="text-xs leading-relaxed" style={{ color: "#c4c4d4" }}>{result.riskReason}</p>
          </div>
        )}

        {/* Relevant Acts */}
        {result.relevantActs?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "#7c6ef7" }}>📚 Relevant Acts</p>
            <div className="space-y-2">
              {result.relevantActs.map((act, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-3 rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(30,38,66,1)" }}>
                  <span className="text-xs font-bold shrink-0 mt-0.5 px-2 py-0.5 rounded-lg"
                    style={{ background: "rgba(212,175,55,0.1)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.2)" }}>
                    {act.section || "§"}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white">{act.act}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#6a6a82" }}>{act.relevance}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Legal Insights */}
        {result.legalInsights?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "#7c6ef7" }}>💡 Legal Insights</p>
            <ul className="space-y-1.5">
              {result.legalInsights.map((ins, i) => (
                <li key={i} className="flex gap-2 text-xs" style={{ color: "#a1a1aa" }}>
                  <span style={{ color: "#7c6ef7", flexShrink: 0 }}>→</span>
                  {ins}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Remedies */}
        {result.suggestedRemedies?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#7c6ef7" }}>🛡️ Suggested Remedies</p>
            <div className="flex flex-wrap gap-2">
              {result.suggestedRemedies.map((r, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={{ background: "rgba(212,175,55,0.08)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.18)" }}>
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Limitation warning */}
        {result.limitationWarning && (
          <div className="rounded-xl p-3"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
            <p className="text-xs font-bold mb-1" style={{ color: "#f87171" }}>⏰ Limitation Notice</p>
            <p className="text-xs" style={{ color: "#a1a1aa" }}>{result.limitationWarning}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
