import { useCallback, useEffect, useState } from "react";
import { mobileServices } from "../services";
import type { ContractTutorAnswerKind } from "@tegang/types";

export interface TutorMessage {
  id: string;
  role: "employee" | "assistant";
  text: string;
  citationIds?: string[];
  kind?: ContractTutorAnswerKind;
  highRiskNotice?: string;
  feedback?: "helpful" | "unhelpful";
}

export interface TutorFailure {
  question: string;
  message: string;
}

export function useTutorConversation(taskId: string) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<TutorFailure | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await mobileServices.tutor.getSession(taskId);
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          text: response.data.welcome
        }
      ]);
      setSuggestions(response.data.suggestions ?? []);
    } catch (loadError) {
      setFailure({
        question: "",
        message:
          loadError instanceof Error
            ? loadError.message
            : "智能辅导暂时不可用。"
      });
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  const send = async (
    question = input,
    options: { appendQuestion?: boolean } = {},
  ) => {
    const trimmed = question.trim();
    if (!trimmed || sending) return;
    const appendQuestion = options.appendQuestion ?? true;
    setSending(true);
    setFailure(null);
    if (appendQuestion) {
      setMessages((current) => [
        ...current,
        {
          id: `employee-${Date.now()}`,
          role: "employee",
          text: trimmed
        }
      ]);
    }
    setInput("");
    try {
      const response = await mobileServices.tutor.ask(taskId, trimmed);
      setMessages((current) => [
        ...current,
        {
          id: response.data.id,
          role: "assistant",
          text: response.data.answer,
          citationIds: response.data.knowledge_citation_ids,
          kind: response.data.kind,
          highRiskNotice: response.data.high_risk_notice ?? undefined
        }
      ]);
    } catch (sendError) {
      setInput(trimmed);
      setFailure({
        question: trimmed,
        message:
          sendError instanceof Error
            ? sendError.message
            : "回答暂时无法生成，请稍后重试。"
      });
    } finally {
      setSending(false);
    }
  };

  const retry = () => {
    if (failure?.question) {
      void send(failure.question, { appendQuestion: false });
    } else {
      void load();
    }
  };

  const requestHumanHelp = async () => {
    try {
      const response = await mobileServices.tutor.requestHumanHelp(
        taskId,
        failure?.question,
      );
      setNotice(response.data.message);
    } catch (helpError) {
      setNotice(
        helpError instanceof Error
          ? helpError.message
          : "人工帮助请求提交失败。",
      );
    }
  };

  const submitFeedback = async (messageId: string, helpful: boolean) => {
    try {
      await mobileServices.tutor.submitFeedback(messageId, helpful);
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                feedback: helpful ? "helpful" : "unhelpful"
              }
            : message,
        ),
      );
      setNotice("感谢反馈");
    } catch (feedbackError) {
      setNotice(
        feedbackError instanceof Error
          ? feedbackError.message
          : "反馈暂时无法提交。",
      );
    }
  };

  return {
    messages,
    suggestions,
    input,
    loading,
    sending,
    failure,
    notice,
    setInput,
    send,
    retry,
    requestHumanHelp,
    submitFeedback,
    clearNotice: () => setNotice("")
  };
}
