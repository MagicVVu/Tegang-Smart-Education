import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContractAssessmentQuestion, ContractAssessmentResultView } from "@tegang/types";
import {
  MobileServiceError,
  mobileServices,
} from "../services";
import { useMobileStore } from "../stores/mobile-store";

export type DraftSaveState = "idle" | "saving" | "synced" | "local";

export function useAssessmentSession(taskId: string, attempt: number) {
  const [questions, setQuestions] = useState<ContractAssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saveState, setSaveState] = useState<DraftSaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recordAssessmentResult = useMobileStore(
    (state) => state.recordAssessmentResult,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [questionResponse, draftResponse] = await Promise.all([
        mobileServices.assessment.getQuestions(taskId),
        mobileServices.assessment.getDraft(taskId, attempt)
      ]);
      setQuestions(questionResponse.data);
      if (draftResponse.data) {
        setAnswers(draftResponse.data.answers);
        setSaveState(
          draftResponse.data.storage === "synced" ? "synced" : "local",
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "测评题目暂时无法加载。",
      );
    } finally {
      setLoading(false);
    }
  }, [attempt, taskId]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id]?.length).length,
    [answers, questions],
  );

  const choose = async (question: ContractAssessmentQuestion, optionIndex: number) => {
    const selected = answers[question.id] ?? [];
    const nextAnswers = {
      ...answers,
      [question.id]:
        question.question_type === "multiple"
          ? selected.includes(optionIndex)
            ? selected.filter((item) => item !== optionIndex)
            : [...selected, optionIndex]
          : [optionIndex]
    };
    setAnswers(nextAnswers);
    setSaveState("saving");
    try {
      await mobileServices.assessment.saveDraft(taskId, attempt, nextAnswers);
      setSaveState("synced");
    } catch {
      setSaveState("local");
    }
  };

  const submit = async (): Promise<ContractAssessmentResultView | null> => {
    if (submitting || submitted) return null;
    if (answeredCount < questions.length) {
      setError(`还有 ${questions.length - answeredCount} 道题未完成。`);
      return null;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await mobileServices.assessment.submit(
        taskId,
        answers,
        attempt,
      );
      setSubmitted(true);
      await recordAssessmentResult(response.data);
      return response.data;
    } catch (submitError) {
      if (
        submitError instanceof MobileServiceError &&
        submitError.code === "DUPLICATE_SUBMISSION"
      ) {
        setSubmitted(true);
      }
      setError(
        submitError instanceof Error
          ? submitError.message
          : "提交失败，答案已保留，可直接重试。",
      );
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    questions,
    answers,
    loading,
    submitting,
    submitted,
    saveState,
    error,
    answeredCount,
    choose,
    submit,
    reload: load,
    clearError: () => setError(null)
  };
}
