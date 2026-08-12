import { create } from "zustand";
import { agentRun, approvalRecord, candidatePlans, trainingTask } from "@tegang/mock-data";
import type {
  ContractAgentRun,
  ContractAuthPrincipal,
  ContractApprovalDecision,
  ContractApprovalStatus,
  ContractLearningRecordStatus,
  ContractTrainingTaskStatus,
  ContractUserRole
} from "@tegang/types";
import { assessmentNextStatus, nextStatusAfterRisk } from "@tegang/business-rules";

export type DemoScenario =
  | "normal"
  | "high_risk"
  | "information_missing"
  | "assessment_failed"
  | "knowledge_conflict"
  | "agent_failure";

interface PrototypeState {
  role: ContractUserRole | null;
  principal: ContractAuthPrincipal | null;
  scenario: DemoScenario;
  task_status: ContractTrainingTaskStatus;
  learning_status: ContractLearningRecordStatus;
  selected_plan_id: string;
  approval_status: ContractApprovalStatus;
  agent: ContractAgentRun;
  retry_count: number;
  employee_progress: number;
  assessment_attempt: number;
  assessment_passed: boolean | null;
  high_risk_passed: boolean | null;
  login: (role: ContractUserRole) => void;
  setPrincipal: (principal: ContractAuthPrincipal) => void;
  logout: () => void;
  setScenario: (scenario: DemoScenario) => void;
  saveDraft: () => void;
  submitTraining: () => void;
  completeAnalysis: () => void;
  selectPlan: (plan_id: string) => void;
  confirmPlan: () => void;
  submitApproval: () => void;
  decideApproval: (decision: ContractApprovalDecision) => void;
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

const makeAgent = (): ContractAgentRun => ({
  ...agentRun,
  state: { ...agentRun.state },
  steps: (agentRun.steps ?? []).map((step) => ({ ...step })),
  decisions: (agentRun.decisions ?? []).map((decision) => ({ ...decision }))
});

const initialState = {
  role: null,
  principal: null,
  scenario: "high_risk" as DemoScenario,
  task_status: trainingTask.task_status,
  learning_status: trainingTask.learning_status,
  selected_plan_id: candidatePlans[1]?.id ?? candidatePlans[0]!.id,
  approval_status: approvalRecord.status,
  agent: makeAgent(),
  retry_count: 0,
  employee_progress: 32,
  assessment_attempt: 1,
  assessment_passed: null,
  high_risk_passed: null
};

export const usePrototypeStore = create<PrototypeState>((set, get) => ({
  ...initialState,
  login: (role) => set({ role }),
  setPrincipal: (principal) => set({ principal, role: principal.primary_role }),
  logout: () => set({ role: null, principal: null }),
  setScenario: (scenario) => {
    const taskByScenario: Record<DemoScenario, ContractTrainingTaskStatus> = {
      normal: "TB-WAIT-CONFIRM",
      high_risk: "TB-WAIT-CONFIRM",
      information_missing: "TB-NEED-INPUT",
      assessment_failed: "TB-IN-PROGRESS",
      knowledge_conflict: "TB-PAUSED",
      agent_failure: "TB-FAILED"
    };
    const learningByScenario: Record<DemoScenario, ContractLearningRecordStatus> = {
      normal: "LR-LEARNING",
      high_risk: "LR-LEARNING",
      information_missing: "LR-PENDING",
      assessment_failed: "LR-NOT-MET",
      knowledge_conflict: "LR-PAUSED",
      agent_failure: "LR-PAUSED"
    };
    const agentStatus = scenario === "agent_failure"
      ? "AR-FAILED" as const
      : scenario === "knowledge_conflict"
        ? "AR-PAUSED" as const
        : "AR-WAIT-INPUT" as const;
    set({
      scenario,
      task_status: taskByScenario[scenario],
      learning_status: learningByScenario[scenario],
      approval_status: "AP-WAITING",
      retry_count: scenario === "agent_failure" ? 1 : 0,
      employee_progress: scenario === "assessment_failed" ? 100 : 32,
      assessment_passed: scenario === "assessment_failed" ? false : null,
      high_risk_passed: scenario === "assessment_failed" ? false : null,
      agent: {
        ...makeAgent(),
        status: agentStatus,
        state: { ...makeAgent().state, status: agentStatus },
        current_stage: scenario === "agent_failure"
          ? "Skill 调用失败，等待恢复处理"
          : agentRun.current_stage
      }
    });
  },
  saveDraft: () => set({ task_status: "TB-DRAFT" }),
  submitTraining: () => {
    if (get().scenario === "information_missing") {
      set({ task_status: "TB-NEED-INPUT" });
      return;
    }
    set((state) => ({
      task_status: "TB-ANALYZING",
      agent: {
        ...state.agent,
        status: "AR-RUNNING",
        state: { ...state.agent.state, status: "AR-RUNNING" },
        current_stage: "理解目标与约束"
      }
    }));
  },
  completeAnalysis: () => set((state) => ({
    task_status: "TB-WAIT-CONFIRM",
    agent: {
      ...state.agent,
      status: "AR-WAIT-INPUT",
      state: { ...state.agent.state, status: "AR-WAIT-INPUT" },
      current_stage: "候选方案完成，等待培训管理员确认",
      steps: (state.agent.steps ?? []).map((step) => ({ ...step, status: "succeeded" }))
    }
  })),
  selectPlan: (selected_plan_id) => set({ selected_plan_id }),
  confirmPlan: () => {
    const selected = candidatePlans.find((plan) => plan.id === get().selected_plan_id) ?? candidatePlans[0]!;
    set({ task_status: nextStatusAfterRisk(get().scenario === "normal" ? "medium" : selected.risk_level ?? "low") });
  },
  submitApproval: () => set({ task_status: "TB-WAIT-APPROVAL", approval_status: "AP-WAITING" }),
  decideApproval: (decision) => {
    if (decision === "rejected") {
      set({ approval_status: "AP-REJECTED", task_status: "TB-APPROVAL-REJECTED" });
      return;
    }
    if (decision === "returned_for_information") {
      set({ approval_status: "AP-EDITING", task_status: "TB-NEED-INPUT" });
      return;
    }
    set({
      approval_status: decision === "approved_with_changes" ? "AP-EDITING" : "AP-APPROVED",
      task_status: decision === "approved_with_changes" ? "TB-APPROVAL-EDIT" : "TB-WAIT-PUBLISH"
    });
  },
  completeApprovalModification: () => set({ task_status: "TB-WAIT-PUBLISH", approval_status: "AP-APPROVED" }),
  reviseAfterRejection: () => set({ task_status: "TB-ANALYZING", approval_status: "AP-WAITING" }),
  publish: () => set({ task_status: "TB-IN-PROGRESS", learning_status: "LR-PENDING", employee_progress: 0 }),
  markLearningStarted: () => set({ learning_status: "LR-LEARNING", employee_progress: 36 }),
  finishLearning: () => set({ learning_status: "LR-WAIT-ASSESSMENT", employee_progress: 100 }),
  submitAssessment: (forcePass) => {
    const state = get();
    const passed = forcePass ?? (state.scenario !== "assessment_failed" && state.assessment_attempt > 1);
    const learning_status = assessmentNextStatus(passed, passed, state.assessment_attempt - 1);
    set({
      assessment_passed: passed,
      high_risk_passed: passed,
      learning_status,
      task_status: passed ? "TB-COMPLETED" : learning_status === "LR-PAUSED" ? "TB-MANUAL" : "TB-IN-PROGRESS"
    });
  },
  startRemedial: () => set({ learning_status: "LR-REMEDIAL" }),
  finishRemedial: () => set((state) => ({ learning_status: "LR-RETESTING", assessment_attempt: state.assessment_attempt + 1 })),
  triggerAgentFailure: () => set((state) => ({
    task_status: "TB-FAILED",
    retry_count: 1,
    agent: {
      ...state.agent,
      status: "AR-FAILED",
      state: { ...state.agent.state, status: "AR-FAILED" },
      current_stage: "下发 Skill 调用失败",
      steps: (state.agent.steps ?? []).map((step, index, all) => index === all.length - 1
        ? { ...step, status: "failed", error_code: "SKILL_TIMEOUT", retry_count: 1 }
        : step)
    }
  })),
  retryAgent: () => set((state) => {
    const manual = state.retry_count >= 2;
    return {
      task_status: manual ? "TB-MANUAL" : "TB-ANALYZING",
      retry_count: state.retry_count + 1,
      agent: {
        ...state.agent,
        status: manual ? "AR-MANUAL" : "AR-RETRYING",
        state: { ...state.agent.state, status: manual ? "AR-MANUAL" : "AR-RETRYING" },
        current_stage: manual ? "自动恢复达到上限，等待人工接管" : "正在从正式检查点重试"
      }
    };
  }),
  rollbackAgent: () => set((state) => ({
    task_status: "TB-WAIT-CONFIRM",
    agent: { ...state.agent, status: "AR-WAIT-INPUT", state: { ...state.agent.state, status: "AR-WAIT-INPUT" }, current_stage: "已回退到稳定检查点" }
  })),
  requestTakeover: () => set((state) => ({
    task_status: "TB-MANUAL",
    agent: { ...state.agent, status: "AR-MANUAL", state: { ...state.agent.state, status: "AR-MANUAL" }, current_stage: "人工接管：培训管理员处理" }
  })),
  pause: () => set((state) => ({ task_status: "TB-PAUSED", agent: { ...state.agent, status: "AR-PAUSED", state: { ...state.agent.state, status: "AR-PAUSED" } } })),
  resume: () => set((state) => ({ task_status: "TB-WAIT-CONFIRM", agent: { ...state.agent, status: "AR-WAIT-INPUT", state: { ...state.agent.state, status: "AR-WAIT-INPUT" } } })),
  resetDemo: () => set({ ...initialState, agent: makeAgent() })
}));
