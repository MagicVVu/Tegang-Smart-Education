import { create } from "zustand";
import {
  agentRun,
  approvalRecord,
  candidatePlans,
  trainingTask
} from "@tegang/mock-data";
import type {
  AgentRun,
  ApprovalDecision,
  DemoScenario,
  TrainingStatus,
  UserRole
} from "@tegang/types";
import {
  assessmentNextStatus,
  nextStatusAfterRisk
} from "@tegang/business-rules";

interface PrototypeState {
  role: UserRole | null;
  scenario: DemoScenario;
  taskStatus: TrainingStatus;
  selectedPlanId: string;
  approvalStatus: typeof approvalRecord.status;
  agent: AgentRun;
  retryCount: number;
  employeeProgress: number;
  assessmentAttempt: number;
  assessmentPassed: boolean | null;
  highRiskPassed: boolean | null;
  login: (role: UserRole) => void;
  logout: () => void;
  setScenario: (scenario: DemoScenario) => void;
  saveDraft: () => void;
  submitTraining: () => void;
  completeAnalysis: () => void;
  selectPlan: (planId: string) => void;
  confirmPlan: () => void;
  submitApproval: () => void;
  decideApproval: (decision: ApprovalDecision) => void;
  completeApprovalModification: () => void;
  reviseAfterRejection: () => void;
  publish: () => void;
  markLearningStarted: () => void;
  finishLearning: () => void;
  submitAssessment: (forcePass?: boolean) => void;
  startRemedial: () => void;
  finishRemedial: () => void;
  triggerAgentFailure: () => void;
  retryAgent: () => void;
  rollbackAgent: () => void;
  requestTakeover: () => void;
  pause: () => void;
  resume: () => void;
  resetDemo: () => void;
}

const makeAgent = (): AgentRun => ({
  ...agentRun,
  nodes: agentRun.nodes.map((node) => ({ ...node })),
  decisions: agentRun.decisions.map((decision) => ({ ...decision }))
});

const initialState = {
  role: null,
  scenario: "high_risk" as DemoScenario,
  taskStatus: trainingTask.status,
  selectedPlanId: candidatePlans[1]?.id ?? candidatePlans[0]!.id,
  approvalStatus: approvalRecord.status,
  agent: makeAgent(),
  retryCount: 0,
  employeeProgress: 32,
  assessmentAttempt: 1,
  assessmentPassed: null,
  highRiskPassed: null
};

export const usePrototypeStore = create<PrototypeState>((set, get) => ({
  ...initialState,
  login: (role) => set({ role }),
  logout: () => set({ role: null }),
  setScenario: (scenario) => {
    const statusByScenario: Partial<Record<DemoScenario, TrainingStatus>> = {
      normal: "awaiting_admin_confirmation",
      high_risk: "awaiting_admin_confirmation",
      information_missing: "information_missing",
      assessment_failed: "assessment_failed",
      knowledge_conflict: "paused",
      agent_failure: "execution_failed"
    };
    set({
      scenario,
      taskStatus: statusByScenario[scenario] ?? "draft",
      approvalStatus: "pending",
      retryCount: scenario === "agent_failure" ? 1 : 0,
      employeeProgress: scenario === "assessment_failed" ? 100 : 32,
      assessmentPassed: scenario === "assessment_failed" ? false : null,
      highRiskPassed: scenario === "assessment_failed" ? false : null,
      agent: {
        ...makeAgent(),
        status: statusByScenario[scenario] ?? "draft",
        currentStage:
          scenario === "agent_failure"
            ? "Skill 调用失败，等待恢复处理"
            : agentRun.currentStage
      }
    });
  },
  saveDraft: () => set({ taskStatus: "draft" }),
  submitTraining: () => {
    if (get().scenario === "information_missing") {
      set({ taskStatus: "information_missing" });
      return;
    }
    set((state) => ({
      taskStatus: "agent_analyzing",
      agent: {
        ...state.agent,
        status: "agent_analyzing",
        currentStage: "理解目标与约束"
      }
    }));
  },
  completeAnalysis: () =>
    set((state) => ({
      taskStatus: "awaiting_admin_confirmation",
      agent: {
        ...state.agent,
        status: "awaiting_admin_confirmation",
        currentStage: "候选方案完成，等待管理员确认",
        nodes: state.agent.nodes.map((node) => ({
          ...node,
          status: "succeeded"
        }))
      }
    })),
  selectPlan: (selectedPlanId) => set({ selectedPlanId }),
  confirmPlan: () => {
    const scenario = get().scenario;
    const selected =
      candidatePlans.find((plan) => plan.id === get().selectedPlanId) ??
      candidatePlans[0]!;
    const risk =
      scenario === "normal" ? "medium" : selected.riskLevel;
    set({ taskStatus: nextStatusAfterRisk(risk) });
  },
  submitApproval: () => set({ taskStatus: "awaiting_approval" }),
  decideApproval: (decision) => {
    if (decision === "rejected") {
      set({
        approvalStatus: "rejected",
        taskStatus: "approval_rejected"
      });
      return;
    }
    if (decision === "returned_for_information") {
      set({
        approvalStatus: "returned",
        taskStatus: "information_missing"
      });
      return;
    }
    set({
      approvalStatus:
        decision === "approved_with_changes"
          ? "approved_with_changes"
          : "approved",
      taskStatus:
        decision === "approved_with_changes"
          ? "approval_modification"
          : "awaiting_publish"
    });
  },
  completeApprovalModification: () =>
    set({ taskStatus: "awaiting_publish" }),
  reviseAfterRejection: () =>
    set({
      taskStatus: "agent_analyzing",
      approvalStatus: "pending"
    }),
  publish: () =>
    set({
      taskStatus: "executing",
      employeeProgress: 0
    }),
  markLearningStarted: () =>
    set({ taskStatus: "learning", employeeProgress: 36 }),
  finishLearning: () =>
    set({ taskStatus: "awaiting_assessment", employeeProgress: 100 }),
  submitAssessment: (forcePass) => {
    const state = get();
    const passed =
      forcePass ?? (state.scenario !== "assessment_failed" && state.assessmentAttempt > 1);
    const highRiskPassed = passed;
    set({
      assessmentPassed: passed,
      highRiskPassed,
      taskStatus: assessmentNextStatus(
        passed,
        highRiskPassed,
        state.assessmentAttempt - 1,
      )
    });
  },
  startRemedial: () => set({ taskStatus: "remedial_learning" }),
  finishRemedial: () =>
    set((state) => ({
      taskStatus: "reassessment",
      assessmentAttempt: state.assessmentAttempt + 1
    })),
  triggerAgentFailure: () =>
    set((state) => ({
      taskStatus: "execution_failed",
      retryCount: 1,
      agent: {
        ...state.agent,
        status: "execution_failed",
        currentStage: "下发 Skill 调用失败",
        nodes: state.agent.nodes.map((node, index) =>
          index === state.agent.nodes.length - 1
            ? {
                ...node,
                status: "failed",
                errorCode: "SKILL_TIMEOUT",
                retryCount: 1
              }
            : node,
        )
      }
    })),
  retryAgent: () =>
    set((state) => ({
      taskStatus: state.retryCount >= 2 ? "human_takeover" : "agent_analyzing",
      retryCount: state.retryCount + 1,
      agent: {
        ...state.agent,
        status:
          state.retryCount >= 2 ? "human_takeover" : "agent_analyzing",
        currentStage:
          state.retryCount >= 2
            ? "自动恢复达到上限，等待人工接管"
            : "正在从检查点 CP-05 重试"
      }
    })),
  rollbackAgent: () =>
    set((state) => ({
      taskStatus: "awaiting_admin_confirmation",
      agent: {
        ...state.agent,
        status: "awaiting_admin_confirmation",
        currentStage: "已回退到稳定检查点 CP-04"
      }
    })),
  requestTakeover: () =>
    set((state) => ({
      taskStatus: "human_takeover",
      agent: {
        ...state.agent,
        status: "human_takeover",
        currentStage: "人工接管：培训管理员处理"
      }
    })),
  pause: () => set({ taskStatus: "paused" }),
  resume: () => set({ taskStatus: "awaiting_admin_confirmation" }),
  resetDemo: () => set({ ...initialState, agent: makeAgent() })
}));
