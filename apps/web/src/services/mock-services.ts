import {
  agentRun,
  approvalRecord,
  assessmentQuestions,
  candidatePlans,
  contractIds,
  demoUsers,
  knowledgeCitations,
  reportSummary,
  trainingTask
} from "@tegang/mock-data";
import { makeRequestId, traceIdForRequest, wait } from "@tegang/shared-utils";
import type {
  ContractApproval,
  ContractAssessmentResultView,
  ContractRealtimeEvent,
  ContractTrainingTaskView
} from "@tegang/types";
import { usePrototypeStore } from "../stores/prototype-store";
import type {
  AgentRunService,
  ApprovalService,
  AssessmentService,
  AuthService,
  KnowledgeService,
  ReportService,
  ServiceResponse,
  TrainingPlanService,
  TrainingService
} from "./interfaces";

const NOW = "2026-07-28T03:05:00Z";

function response<T>(data: T): ServiceResponse<T> {
  const request_id = makeRequestId();
  return {
    data,
    request_id,
    trace_id: traceIdForRequest(request_id),
    occurred_at: new Date().toISOString()
  };
}

export const authService: AuthService = {
  async login({ account, password }) {
    await wait(520);
    const normalized = account.trim().toLowerCase();
    const user = demoUsers.find((item) =>
      [item.user_id, item.display_name, item.account_label ?? ""]
        .some((value) => value.toLowerCase() === normalized),
    );
    if (!user || password.length < 6) throw new Error("账号或密码错误，请核对后重试。");
    usePrototypeStore.getState().login(user.role);
    return response({
      user,
      authenticated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    });
  },
  async developmentLogin(role) {
    await wait(180);
    const user = demoUsers.find((item) => item.role === role);
    if (!user) throw new Error("当前角色未配置登录账号。");
    usePrototypeStore.getState().login(role);
    return response({
      user,
      authenticated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    });
  },
  async listDevelopmentProfiles() {
    await wait(60);
    return demoUsers.map((item) => ({ ...item }));
  }
};

export const trainingService: TrainingService = {
  async listTasks(role) {
    await wait(240);
    if (role === "employee") return response([]);
    return response([{ ...trainingTask, task_status: usePrototypeStore.getState().task_status }]);
  },
  async getTask(task_id) {
    await wait(180);
    if (task_id !== trainingTask.id) throw new Error("任务不存在。");
    const state = usePrototypeStore.getState();
    return response({ ...trainingTask, task_status: state.task_status, learning_status: state.learning_status });
  },
  async createTask(input) {
    await wait(700);
    usePrototypeStore.getState().submitTraining();
    const created: ContractTrainingTaskView = {
      ...trainingTask,
      ...input,
      task_status: usePrototypeStore.getState().task_status,
      learning_status: "LR-PENDING",
      progress_percent: 0,
      created_at: new Date().toISOString()
    };
    return response(created);
  },
  async publishTask(task_id) {
    await wait(650);
    if (task_id !== trainingTask.id) throw new Error("任务不存在。");
    usePrototypeStore.getState().publish();
    return response({ ...trainingTask, task_status: "TB-IN-PROGRESS", learning_status: "LR-PENDING", progress_percent: 0 });
  }
};

export const approvalService: ApprovalService = {
  async getApproval(task_id) {
    await wait(220);
    return response({ ...approvalRecord, task_id, status: usePrototypeStore.getState().approval_status });
  },
  async decide(_approval_id, decision, comment) {
    await wait(620);
    usePrototypeStore.getState().decideApproval(decision);
    const status = usePrototypeStore.getState().approval_status;
    const decided = status === "AP-APPROVED" || status === "AP-REJECTED";
    const result: ContractApproval = {
      ...approvalRecord,
      status,
      decision,
      decision_comment: comment,
      reviewer_id: contractIds.reviewerUser,
      decided_at: decided ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString()
    };
    return response(result);
  }
};

function assessmentResult(task_id: string, passed: boolean, attempt: number): ContractAssessmentResultView {
  const score = passed ? 88 : 62;
  return {
    id: "assessment_result_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    assessment_session_id: "assessment_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    task_id,
    employee_profile_id: contractIds.employeeProfile,
    attempt,
    score_percent: score,
    passed,
    high_risk_passed: passed,
    knowledge_point_performances: [
      {
        id: "kperf_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        status: passed ? "LR-COMPLETED" : "LR-NOT-MET",
        assessment_session_id: "assessment_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        knowledge_point_id: contractIds.kpSteel,
        knowledge_point_name: "高温作业与设备联锁",
        score_percent: passed ? 90 : 45,
        passed,
        reason: passed ? "关键前置条件回答正确。" : "未能完整识别联锁、隔离和监护要求。",
        risk_level: "high",
        created_at: NOW,
        updated_at: NOW
      }
    ],
    next_action: passed ? "complete" : "remediation",
    submitted_at: new Date().toISOString(),
    wrong_answer_reasons: [],
    disclaimer: "测评结果仅用于培训闭环，不得直接用于绩效、晋升、处罚或人事结论。"
  };
}

export const assessmentService: AssessmentService = {
  async getQuestions(task_id) {
    await wait(260);
    if (task_id !== trainingTask.id) throw new Error("任务不存在。");
    return response(assessmentQuestions);
  },
  async submit(task_id, answers, attempt) {
    await wait(850);
    const highRiskAnswer = answers[assessmentQuestions[0]!.id]?.[0] === 1;
    const forcedFailure = usePrototypeStore.getState().scenario === "assessment_failed" && attempt === 1;
    const passed = highRiskAnswer && !forcedFailure;
    usePrototypeStore.getState().submitAssessment(passed);
    return response(assessmentResult(task_id, passed, attempt));
  }
};

export const agentRunService: AgentRunService = {
  async getRun(task_id) {
    await wait(220);
    if (task_id !== trainingTask.id) throw new Error("任务不存在。");
    return response(usePrototypeStore.getState().agent);
  },
  async retry(run_id) {
    await wait(700);
    if (run_id !== agentRun.id) throw new Error("运行记录不存在。");
    usePrototypeStore.getState().retryAgent();
    return response(usePrototypeStore.getState().agent);
  },
  async rollback(run_id) {
    await wait(500);
    if (run_id !== agentRun.id) throw new Error("运行记录不存在。");
    usePrototypeStore.getState().rollbackAgent();
    return response(usePrototypeStore.getState().agent);
  },
  async requestHumanTakeover(run_id) {
    await wait(420);
    if (run_id !== agentRun.id) throw new Error("运行记录不存在。");
    usePrototypeStore.getState().requestTakeover();
    return response(usePrototypeStore.getState().agent);
  },
  async getEvents(run_id) {
    await wait(180);
    if (run_id !== agentRun.id) throw new Error("运行记录不存在。");
    const firstStep = agentRun.steps?.[0];
    if (!firstStep) throw new Error("运行记录缺少正式步骤。");
    const event: ContractRealtimeEvent = {
      id: "event_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      status: "emitted",
      event_type: "approval_required",
      occurred_at: NOW,
      run_id,
      task_id: trainingTask.id,
      sequence: 1,
      payload: {
        id: firstStep.id,
        run_id,
        step_id: firstStep.id,
        status: "waiting",
        progress_percent: 80,
        summary: "高风险规则命中，等待有权人员确认。",
        retry_count: 0,
        formal_write_occurred: false,
        created_at: NOW,
        updated_at: NOW,
        risk_level: "high",
        trace_id: contractIds.trace
      },
      created_at: NOW,
      updated_at: NOW,
      risk_level: "high",
      trace_id: contractIds.trace
    };
    return response([event]);
  }
};

export const knowledgeService: KnowledgeService = {
  async search(query) {
    await wait(460);
    const refused = query.includes("没有依据") || query.includes("预测绩效");
    return {
      knowledge_citation_ids: refused ? [] : knowledgeCitations.slice(0, 2).map((item) => item.id),
      refused,
      message: refused
        ? "现有授权知识不足以支持该结论，需查看正式制度或转人工确认。"
        : "已依据现行有效知识返回受控说明。"
    };
  }
};

export const trainingPlanService: TrainingPlanService = {
  async list(task_id) {
    await wait(220);
    if (task_id !== trainingTask.id) throw new Error("培训方案不存在。");
    return response(candidatePlans.map((plan) => ({ ...plan })));
  },
  async requestReplan(task_id, reason, idempotency_key) {
    await wait(680);
    void idempotency_key;
    if (task_id !== trainingTask.id) throw new Error("培训任务不存在。");
    if (!reason.trim()) throw new Error("请说明重新规划原因。");
    usePrototypeStore.getState().submitTraining();
    return response({ accepted: true, run_id: agentRun.id, status: "TB-ANALYZING" });
  }
};

export const reportService: ReportService = {
  async getSummary(task_id) {
    await wait(240);
    if (task_id !== trainingTask.id) throw new Error("培训报告不存在。");
    return response(reportSummary);
  },
  async requestExport(task_id) {
    await wait(520);
    if (task_id !== trainingTask.id) throw new Error("培训报告不存在。");
    return response({
      accepted: true,
      operation_id: `operation_${makeRequestId().slice(4)}`,
      message: "导出任务已受理，完成后将在消息中心通知。"
    });
  }
};

export const services = {
  auth: authService,
  training: trainingService,
  trainingPlan: trainingPlanService,
  approval: approvalService,
  assessment: assessmentService,
  agentTrace: agentRunService,
  agentRun: agentRunService,
  knowledge: knowledgeService,
  report: reportService
};
