import {
  agentRun,
  approvalRecord,
  assessmentQuestions,
  candidatePlans,
  demoUsers,
  knowledgeCitations,
  reportSummary,
  trainingTask
} from "@tegang/mock-data";
import { makeRequestId, wait } from "@tegang/shared-utils";
import type {
  AgentTraceService,
  ApprovalDecision,
  ApprovalService,
  AssessmentResult,
  AssessmentService,
  ServiceResponse,
  TrainingService,
  TrainingTask,
  UserRole
} from "@tegang/types";
import { usePrototypeStore } from "../stores/prototype-store";
import type {
  AgentRunEvent,
  AgentRunService,
  AuthService,
  KnowledgeService,
  ReportService,
  TrainingPlanService
} from "./interfaces";

function response<T>(data: T): ServiceResponse<T> {
  return {
    data,
    requestId: makeRequestId("web"),
    timestamp: new Date().toISOString()
  };
}

export const authService: AuthService = {
  async login({ account, password }) {
    await wait(520);
    const normalized = account.trim().toLowerCase();
    const user = demoUsers.find(
      (item) =>
        item.id.toLowerCase() === normalized ||
        item.displayName.toLowerCase() === normalized,
    );
    if (!user || password.length < 6) {
      throw new Error("账号或密码错误，请核对后重试。");
    }
    usePrototypeStore.getState().login(user.role);
    const authenticatedAt = new Date().toISOString();
    return response({
      user,
      authenticatedAt,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    });
  },
  async developmentLogin(role) {
    await wait(180);
    const user = demoUsers.find((item) => item.role === role);
    if (!user) throw new Error("当前角色未配置登录账号。");
    usePrototypeStore.getState().login(role);
    const authenticatedAt = new Date().toISOString();
    return response({
      user,
      authenticatedAt,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    });
  },
  async listDevelopmentProfiles() {
    await wait(60);
    return demoUsers.map((item) => ({ ...item }));
  }
};

export const trainingService: TrainingService = {
  async listTasks(role: UserRole) {
    await wait(240);
    if (role === "employee") return response([]);
    return response([
      {
        ...trainingTask,
        status: usePrototypeStore.getState().taskStatus
      }
    ]);
  },
  async getTask(taskId: string) {
    await wait(180);
    if (taskId !== trainingTask.id) throw new Error("任务不存在");
    return response({
      ...trainingTask,
      status: usePrototypeStore.getState().taskStatus
    });
  },
  async createTask(input) {
    await wait(700);
    usePrototypeStore.getState().submitTraining();
    const created: TrainingTask = {
      ...input,
      id: trainingTask.id,
      status: usePrototypeStore.getState().taskStatus,
      progress: 0,
      createdAt: new Date().toISOString()
    };
    return response(created);
  },
  async publishTask(taskId) {
    await wait(650);
    if (taskId !== trainingTask.id) throw new Error("任务不存在");
    usePrototypeStore.getState().publish();
    return response({
      ...trainingTask,
      status: "executing",
      progress: 0
    });
  }
};

export const approvalService: ApprovalService = {
  async getApproval(taskId) {
    await wait(220);
    return response({
      ...approvalRecord,
      taskId,
      status: usePrototypeStore.getState().approvalStatus
    });
  },
  async decide(_approvalId, decision: ApprovalDecision, comment: string) {
    await wait(620);
    usePrototypeStore.getState().decideApproval(decision);
    const status =
      decision === "approved"
        ? "approved"
        : decision === "approved_with_changes"
          ? "approved_with_changes"
          : decision === "rejected"
            ? "rejected"
            : "returned";
    return response({
      ...approvalRecord,
      status,
      comment,
      reviewerId: "REV-R001",
      decidedAt: new Date().toISOString()
    });
  }
};

export const assessmentService: AssessmentService = {
  async getQuestions(taskId) {
    await wait(260);
    if (taskId !== trainingTask.id) throw new Error("任务不存在");
    return response(assessmentQuestions);
  },
  async submit(taskId, answers, attempt) {
    await wait(850);
    const highRiskAnswer = answers["Q-01"]?.[0] === 1;
    const forcedFailure =
      usePrototypeStore.getState().scenario === "assessment_failed" &&
      attempt === 1;
    const passed = highRiskAnswer && !forcedFailure;
    usePrototypeStore.getState().submitAssessment(passed);
    const result: AssessmentResult = {
      id: `AR-${attempt}`,
      taskId,
      attempt,
      score: passed ? 88 : 62,
      passed,
      highRiskPassed: passed,
      knowledgeResults: [
        {
          knowledgePoint: "高温作业与设备联锁",
          score: passed ? 90 : 45,
          passed,
          riskLevel: "high",
          reason: passed
            ? "关键前置条件回答正确。"
            : "未能完整识别联锁、隔离和监护要求。"
        },
        {
          knowledgePoint: "培训过程留痕",
          score: 84,
          passed: true,
          riskLevel: "medium",
          reason: "能够识别引用、答案与审批记录。"
        }
      ],
      nextAction: passed ? "complete" : "remedial"
    };
    return response(result);
  }
};

export const agentTraceService: AgentTraceService = {
  async getRun(taskId) {
    await wait(220);
    if (taskId !== trainingTask.id) throw new Error("任务不存在");
    return response(usePrototypeStore.getState().agent ?? agentRun);
  },
  async retry(runId) {
    await wait(700);
    if (runId !== agentRun.id) throw new Error("运行记录不存在");
    usePrototypeStore.getState().retryAgent();
    return response(usePrototypeStore.getState().agent);
  },
  async rollback(runId) {
    await wait(500);
    if (runId !== agentRun.id) throw new Error("运行记录不存在");
    usePrototypeStore.getState().rollbackAgent();
    return response(usePrototypeStore.getState().agent);
  },
  async requestHumanTakeover(runId) {
    await wait(420);
    if (runId !== agentRun.id) throw new Error("运行记录不存在");
    usePrototypeStore.getState().requestTakeover();
    return response(usePrototypeStore.getState().agent);
  }
};

export const knowledgeService: KnowledgeService = {
  async search(query) {
    await wait(460);
    const insufficient =
      query.includes("没有依据") || query.includes("预测绩效");
    if (insufficient) {
      return {
        citationIds: [],
        refused: true,
        message:
          "现有授权知识不足以支持该结论。我不会据此生成正式判断，建议查看正式制度或转人工确认。"
      };
    }
    return {
      citationIds: knowledgeCitations.slice(0, 2).map((item) => item.id),
      refused: false,
      message:
        "进入高温作业区域前，应先确认设备联锁状态、隔离边界和监护要求；该回答已关联现行有效知识来源。"
    };
  }
};

export const trainingPlanService: TrainingPlanService = {
  async list(taskId) {
    await wait(220);
    if (taskId !== trainingTask.id) throw new Error("培训方案不存在。");
    return response(candidatePlans.map((plan) => ({ ...plan })));
  },
  async requestReplan(taskId, reason, _idempotencyKey) {
    await wait(680);
    void _idempotencyKey;
    if (taskId !== trainingTask.id) throw new Error("培训任务不存在。");
    if (!reason.trim()) throw new Error("请说明重新规划原因。");
    usePrototypeStore.getState().submitTraining();
    return response({
      accepted: true,
      runId: agentRun.id,
      status: "agent_analyzing"
    });
  }
};

export const reportService: ReportService = {
  async getSummary(taskId) {
    await wait(240);
    if (taskId !== trainingTask.id) throw new Error("培训报告不存在。");
    return response(reportSummary);
  },
  async requestExport(taskId, format) {
    await wait(520);
    if (taskId !== trainingTask.id) throw new Error("培训报告不存在。");
    return response({
      accepted: true,
      operationId: makeRequestId(`report-${format}`),
      message: "导出任务已受理，完成后将在消息中心通知。"
    });
  }
};

export const agentRunService: AgentRunService = {
  ...agentTraceService,
  async getEvents(runId) {
    await wait(180);
    if (runId !== agentRun.id) throw new Error("运行记录不存在。");
    const events: AgentRunEvent[] = [
      {
        id: "EVT-01",
        runId,
        type: "AgentStageChanged",
        occurredAt: "2026-07-28T09:31:00+08:00",
        summary: "已建立目标与约束上下文。",
        checkpointId: "CP-01"
      },
      {
        id: "EVT-02",
        runId,
        type: "SkillSucceeded",
        occurredAt: "2026-07-28T09:31:06+08:00",
        summary: "已返回 3 条授权范围内的有效知识引用。",
        checkpointId: "CP-03"
      },
      {
        id: "EVT-03",
        runId,
        type: "ApprovalRequired",
        occurredAt: "2026-07-28T09:31:11+08:00",
        summary: "高风险规则命中，流程暂停并等待审核员决定。",
        checkpointId: "CP-05"
      }
    ];
    return response(events);
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
