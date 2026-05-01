"use client";

import { useState, useCallback } from "react";
import api from "@/lib/api";

export type CaseFormData = {
  // Basic
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
  // Parties
  opponentName: string;
  opponentCounsel: string;
  firmId: string;
  // Timeline
  filedAt: string;
  limitationDate: string;
  // AI
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

const defaultForm: CaseFormData = {
  title: "", description: "", caseType: "", priority: "MEDIUM", status: "OPEN", tags: [],
  caseNumber: "", court: "", courtLevel: "", courtState: "", benchType: "", judgeName: "",
  opponentName: "", opponentCounsel: "", firmId: "",
  filedAt: "", limitationDate: "",
  factSummary: "", reliefSought: "", actsInvolved: [],
};

const STEP_FIELDS: Record<number, (keyof CaseFormData)[]> = {
  1: ["title", "caseType"],
  2: [],
  3: [],
};

export function useCaseForm(onSuccess: () => void) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CaseFormData>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof CaseFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AiAnalysis | null>(null);
  const [submitError, setSubmitError] = useState("");

  const setField = useCallback(
    <K extends keyof CaseFormData>(key: K, value: CaseFormData[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      setErrors((e) => ({ ...e, [key]: undefined }));
    },
    []
  );

  const validate = (stepNum: number): boolean => {
    const newErrors: Partial<Record<keyof CaseFormData, string>> = {};
    if (stepNum === 1) {
      if (!form.title.trim() || form.title.trim().length < 3)
        newErrors.title = "Title must be at least 3 characters";
      if (!form.caseType)
        newErrors.caseType = "Please select a case type";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const next = () => {
    if (validate(step)) setStep((s) => Math.min(s + 1, 3));
  };

  const back = () => {
    setStep((s) => Math.max(s - 1, 1));
    setErrors({});
  };

  const reset = () => {
    setForm(defaultForm);
    setStep(1);
    setErrors({});
    setAiResult(null);
    setSubmitError("");
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      await api.post("/cases", {
        ...form,
        tags: form.tags,
        actsInvolved: form.actsInvolved,
      });
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
      setErrors((e) => ({ ...e, factSummary: "Please provide at least 20 characters of facts for analysis." }));
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
    setField, next, back, reset, submit, analyzeWithAI,
  };
}
