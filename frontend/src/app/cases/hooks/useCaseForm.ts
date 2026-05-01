"use client";

import { useState, useCallback } from "react";
import api from "@/lib/api";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export type PartyData = {
  partyType: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  aadhaarRaw: string;
  aadhaarConsent: boolean;
};

export type AdvocateData = {
  fullName: string;
  enrollmentNo: string;
  barCouncilState: string;
  phone: string;
  email: string;
  represents: string;
};

export type CaseFormData = {
  // Step 1 — Case Info
  title: string;
  description: string;
  caseType: string;
  priority: string;
  status: string;
  tags: string[];
  // Court
  caseNumber: string;
  court: string;
  courtLevel: string;
  courtState: string;
  benchType: string;
  judgeName: string;
  // Legal details
  actSection: string;
  firNumber: string;
  policeStation: string;
  courtFeeAmount: string;
  // Timeline
  filedAt: string;
  limitationDate: string;

  // Step 2 — Plaintiff
  plaintiff: PartyData;

  // Step 3 — Defendant
  defendant: PartyData;

  // Step 4 — Extra Parties
  extraParties: PartyData[];

  // Step 5 — Advocate
  advocate: AdvocateData;

  // Step 6 — AI
  factSummary: string;
  reliefSought: string;
  actsInvolved: string[];
};

export type AiAnalysis = {
  summary: string;
  relevantActs: { act: string; section: string; relevance: string }[];
  legalInsights: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskReason: string;
  suggestedRemedies: string[];
  limitationWarning?: string;
};

// ─────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────

const emptyParty = (type: string): PartyData => ({
  partyType: type,
  fullName: "", gender: "", dateOfBirth: "",
  email: "", phone: "",
  addressLine1: "", addressLine2: "", city: "", state: "", pincode: "",
  aadhaarRaw: "", aadhaarConsent: false,
});

const emptyAdvocate = (): AdvocateData => ({
  fullName: "", enrollmentNo: "", barCouncilState: "",
  phone: "", email: "", represents: "PLAINTIFF",
});

const defaultForm = (): CaseFormData => ({
  title: "", description: "", caseType: "", priority: "MEDIUM", status: "OPEN", tags: [],
  caseNumber: "", court: "", courtLevel: "", courtState: "", benchType: "", judgeName: "",
  actSection: "", firNumber: "", policeStation: "", courtFeeAmount: "",
  filedAt: "", limitationDate: "",
  plaintiff: emptyParty("PLAINTIFF"),
  defendant: emptyParty("DEFENDANT"),
  extraParties: [],
  advocate: emptyAdvocate(),
  factSummary: "", reliefSought: "", actsInvolved: [],
});

// ─────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────

export function useCaseForm(onSuccess: () => void) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CaseFormData>(defaultForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AiAnalysis | null>(null);
  const [submitError, setSubmitError] = useState("");

  // Generic field setter (top-level)
  const setField = useCallback(<K extends keyof CaseFormData>(key: K, value: CaseFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key as string]; return n; });
  }, []);

  // Nested party field setter
  const setPartyField = useCallback(
    (role: "plaintiff" | "defendant", field: keyof PartyData, value: string | boolean) => {
      setForm((f) => ({ ...f, [role]: { ...f[role], [field]: value } }));
    }, []
  );

  // Extra parties
  const addExtraParty = () =>
    setForm((f) => ({ ...f, extraParties: [...f.extraParties, emptyParty("WITNESS")] }));

  const removeExtraParty = (idx: number) =>
    setForm((f) => ({ ...f, extraParties: f.extraParties.filter((_, i) => i !== idx) }));

  const setExtraPartyField = useCallback(
    (idx: number, field: keyof PartyData, value: string | boolean) => {
      setForm((f) => {
        const updated = [...f.extraParties];
        updated[idx] = { ...updated[idx], [field]: value };
        return { ...f, extraParties: updated };
      });
    }, []
  );

  // Advocate field setter
  const setAdvocateField = useCallback(
    (field: keyof AdvocateData, value: string) => {
      setForm((f) => ({ ...f, advocate: { ...f.advocate, [field]: value } }));
    }, []
  );

  // Step validation
  const validate = (stepNum: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (stepNum === 1) {
      if (!form.title.trim() || form.title.trim().length < 3)
        newErrors["title"] = "Title must be at least 3 characters";
      if (!form.caseType)
        newErrors["caseType"] = "Please select a case type";
    }
    if (stepNum === 2) {
      if (!form.plaintiff.fullName.trim())
        newErrors["plaintiff.fullName"] = "Plaintiff name is required";
    }
    if (stepNum === 3) {
      if (!form.defendant.fullName.trim())
        newErrors["defendant.fullName"] = "Defendant name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const next = () => { if (validate(step)) setStep((s) => Math.min(s + 1, 6)); };
  const back = () => { setStep((s) => Math.max(s - 1, 1)); setErrors({}); };

  const reset = () => {
    setForm(defaultForm());
    setStep(1);
    setErrors({});
    setAiResult(null);
    setSubmitError("");
  };

  // Submit — creates case then POSTs parties & advocate
  const submit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      // 1. Create the case
      const { data: newCase } = await api.post("/cases", {
        title: form.title, description: form.description,
        caseType: form.caseType, priority: form.priority, status: form.status, tags: form.tags,
        caseNumber: form.caseNumber || undefined,
        court: form.court, courtLevel: form.courtLevel, courtState: form.courtState,
        benchType: form.benchType, judgeName: form.judgeName,
        actSection: form.actSection, firNumber: form.firNumber,
        policeStation: form.policeStation,
        courtFeeAmount: form.courtFeeAmount ? parseFloat(form.courtFeeAmount) : undefined,
        filedAt: form.filedAt || undefined,
        limitationDate: form.limitationDate || undefined,
        factSummary: form.factSummary, reliefSought: form.reliefSought,
        actsInvolved: form.actsInvolved,
      });

      const caseId = newCase.id;

      // 2. Add plaintiff (if name provided)
      if (form.plaintiff.fullName.trim()) {
        await api.post(`/cases/${caseId}/parties`, form.plaintiff).catch(() => {});
      }

      // 3. Add defendant (if name provided)
      if (form.defendant.fullName.trim()) {
        await api.post(`/cases/${caseId}/parties`, form.defendant).catch(() => {});
      }

      // 4. Add extra parties
      for (const ep of form.extraParties) {
        if (ep.fullName.trim()) {
          await api.post(`/cases/${caseId}/parties`, ep).catch(() => {});
        }
      }

      // 5. Add advocate (if name provided)
      if (form.advocate.fullName.trim()) {
        await api.post(`/cases/${caseId}/advocates`, form.advocate).catch(() => {});
      }

      reset();
      onSuccess();
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || "Failed to create case. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const analyzeWithAI = async () => {
    if (!form.factSummary || form.factSummary.trim().length < 20) {
      setErrors((e) => ({ ...e, factSummary: "Please provide at least 20 characters of facts." }));
      return;
    }
    setAnalyzing(true);
    setAiResult(null);
    try {
      const { data } = await api.post("/cases/analyze", {
        factSummary: form.factSummary,
        caseType: form.caseType,
        actsInvolved: form.actsInvolved,
        reliefSought: form.reliefSought,
      });
      setAiResult(data.analysis);
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || "AI analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  return {
    step, form, errors, submitting, analyzing, aiResult, submitError,
    setField, setPartyField, setExtraPartyField, setAdvocateField,
    addExtraParty, removeExtraParty,
    next, back, reset, submit, analyzeWithAI,
  };
}
