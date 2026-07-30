import type {
  AssessmentQuestion,
  KnowledgeResult,
  ServiceResponse,
  TrainingStatus
} from "@tegang/types";
import { makeRequestId, wait } from "@tegang/shared-utils";
import {
  citations,
  completedTask,
  courseCopy,
  employeeCourseModules,
  employeeProfile,
  notificationFixtures,
  primaryTaskBase,
  questions,
  remedialCopy,
  trainingRecordFixtures
} from "./fixtures";
import {
  MobileServiceError,
  type AssessmentDraft,
  type EmployeeTaskFilter,
  type EmployeeTrainingTask,
  type MobileAssessmentResult,
  type MobileServices,
  type NotificationItem
} from "./contracts";

interface MockFailureConfig {
  networkOffline: boolean;
  emptyTasks: boolean;
  courseUnavailable: boolean;
  citationUnavailable: boolean;
  tutorFailuresRemaining: number;
  sessionExpired: boolean;
}

interface MockRuntime {
  authenticated: boolean;
  status: TrainingStatus;
  progress: number;
  currentUnitIndex: number;
  assessmentAttempt: number;
  result: MobileAssessmentResult | null;
  drafts: Record<string, AssessmentDraft>;
  submittedAttempts: Set<string>;
  notifications: NotificationItem[];
  completedAt?: string;
  failures: MockFailureConfig;
}

const defaultFailures: MockFailureConfig = {
  networkOffline: false,
  emptyTasks: false,
  courseUnavailable: false,
  citationUnavailable: false,
  tutorFailuresRemaining: 0,
  sessionExpired: false
};

function makeRuntime(): MockRuntime {
  return {
    authenticated: false,
    status: "executing",
    progress: 36,
    currentUnitIndex: 0,
    assessmentAttempt: 1,
    result: null,
    drafts: {},
    submittedAttempts: new Set<string>(),
    notifications: notificationFixtures.map((item) => ({ ...item })),
    failures: { ...defaultFailures }
  };
}

let runtime = makeRuntime();

function response<T>(data: T): ServiceResponse<T> {
  return {
    data,
    requestId: makeRequestId("mobile"),
    timestamp: new Date().toISOString()
  };
}

function assertAvailable() {
  if (runtime.failures.networkOffline) {
    throw new MobileServiceError(
      "NETWORK_ERROR",
      "网络连接不可用，请检查网络后重试。",
      true,
    );
  }
  if (runtime.failures.sessionExpired) {
    throw new MobileServiceError(
      "UNAUTHORIZED",
      "登录状态已失效，请重新登录。",
    );
  }
}

function nextActionFor(status: TrainingStatus): string {
  switch (status) {
    case "executing":
      return "开始学习";
    case "learning":
      return "继续学习";
    case "awaiting_assessment":
      return "开始测评";
    case "assessment_failed":
    case "remedial_learning":
      return "进入定向补训";
    case "reassessment":
      return "开始复测";
    case "completed":
      return "查看完成记录";
    case "information_missing":
      return "等待管理员补充";
    case "awaiting_approval":
      return "等待任务开放";
    case "execution_failed":
      return "稍后重试";
    case "human_takeover":
      return "等待人工处理";
    case "paused":
      return "等待任务恢复";
    case "cancelled":
      return "查看状态说明";
    default:
      return "查看任务";
  }
}

function availabilityReasonFor(status: TrainingStatus): string | undefined {
  switch (status) {
    case "information_missing":
      return "任务信息尚未完整，培训管理员补充后会重新开放。";
    case "awaiting_approval":
      return "培训要求仍在确认中，当前暂不可开始。";
    case "execution_failed":
      return "任务内容暂时无法加载，学习记录不会丢失。";
    case "human_takeover":
      return "本任务已转培训管理员处理，请等待后续通知。";
    case "paused":
      return "相关知识版本正在确认，任务已暂停。";
    case "cancelled":
      return "任务已取消，无需继续学习。";
    default:
      return undefined;
  }
}

function currentTask(): EmployeeTrainingTask {
  return {
    ...primaryTaskBase,
    status: runtime.status,
    progress: runtime.progress,
    nextActionLabel: nextActionFor(runtime.status),
    availabilityReason: availabilityReasonFor(runtime.status)
  };
}

function matchesFilter(
  task: EmployeeTrainingTask,
  filter: EmployeeTaskFilter,
): boolean {
  if (filter === "completed") return task.status === "completed";
  if (filter === "active") {
    return ["executing", "learning"].includes(task.status);
  }
  return !["executing", "learning", "completed"].includes(task.status);
}

function getTaskOrThrow(taskId: string): EmployeeTrainingTask {
  if (taskId === primaryTaskBase.id) return currentTask();
  if (taskId === completedTask.id) return completedTask;
  throw new MobileServiceError("NOT_FOUND", "未找到该培训任务。");
}

function draftKey(taskId: string, attempt: number) {
  return `${taskId}:${attempt}`;
}

function sameAnswers(actual: number[] | undefined, expected: number[]) {
  if (!actual || actual.length !== expected.length) return false;
  const left = [...actual].sort((a, b) => a - b);
  const right = [...expected].sort((a, b) => a - b);
  return left.every((value, index) => value === right[index]);
}

function resultForQuestion(
  question: AssessmentQuestion,
  correct: boolean,
): KnowledgeResult {
  return {
    knowledgePoint: question.knowledgePoint,
    score: correct ? 100 : 0,
    passed: correct,
    riskLevel: question.riskLevel,
    reason: correct
      ? "已正确识别本知识点的关键要求。"
      : question.riskLevel === "high"
        ? "未完整识别联锁、隔离和监护三项前置条件。"
        : question.id === "Q-02"
          ? "对可追溯培训证据的范围理解不完整。"
          : "尚未明确单次测评结果的使用边界。"
  };
}

const seededCompletedResult: MobileAssessmentResult = {
  id: "AR-COMPLETED-01",
  taskId: completedTask.id,
  attempt: 1,
  score: 92,
  passed: true,
  highRiskPassed: true,
  knowledgeResults: [
    {
      knowledgePoint: "生产区域基础制度",
      score: 92,
      passed: true,
      riskLevel: "medium",
      reason: "已掌握身份确认、通行边界与异常报告要求。"
    }
  ],
  nextAction: "complete",
  submittedAt: "2026-06-28T15:40:00+08:00",
  wrongAnswerReasons: []
};

export const mobileServices: MobileServices = {
  auth: {
    async login(credentials) {
      await wait(420);
      assertAvailable();
      const account = credentials.account.trim().toUpperCase();
      if (!account || credentials.password.length < 6) {
        throw new MobileServiceError(
          "VALIDATION_ERROR",
          "请输入有效的账号和密码。",
        );
      }
      if (account.startsWith("A-") || account.startsWith("ADMIN")) {
        throw new MobileServiceError(
          "FORBIDDEN",
          "当前账号没有员工培训端访问权限，请联系管理员。",
        );
      }
      if (account !== employeeProfile.accountLabel) {
        throw new MobileServiceError(
          "UNAUTHORIZED",
          "账号或密码不正确，请重新输入。",
        );
      }
      runtime.authenticated = true;
      return response(employeeProfile);
    },
    async logout() {
      await wait(180);
      runtime.authenticated = false;
      return response({ success: true as const });
    }
  },
  training: {
    async listTasks(filter) {
      await wait(280);
      assertAvailable();
      if (runtime.failures.emptyTasks) return response([]);
      const tasks = [currentTask(), completedTask].filter((task) =>
        matchesFilter(task, filter),
      );
      return response(tasks);
    },
    async getCurrentTask() {
      await wait(240);
      assertAvailable();
      return response(runtime.failures.emptyTasks ? null : currentTask());
    },
    async getTask(taskId) {
      await wait(220);
      assertAvailable();
      return response(getTaskOrThrow(taskId));
    }
  },
  learning: {
    async getCourse(taskId, options) {
      await wait(300);
      assertAvailable();
      getTaskOrThrow(taskId);
      if (runtime.failures.courseUnavailable) {
        throw new MobileServiceError(
          "CONTENT_UNAVAILABLE",
          "课程内容暂时无法加载，请稍后重试。",
          true,
        );
      }
      const isRemedial = Boolean(options?.remedial);
      const units = isRemedial
        ? [
            {
              id: "M-REMEDIAL-STEEL",
              title: "高温作业前置条件强化",
              durationMinutes: 15,
              riskLevel: "high" as const,
              completed: false,
              ...remedialCopy
            }
          ]
        : employeeCourseModules.map((module) => ({
            ...module,
            ...(courseCopy[module.id as keyof typeof courseCopy] ??
              courseCopy["M-BASE"])
          }));
      return response({
        taskId,
        title: isRemedial ? "定向补训" : currentTask().name,
        units,
        currentUnitIndex: isRemedial ? 0 : runtime.currentUnitIndex,
        contentVersion: "2026.07",
        isRemedial
      });
    },
    async start(taskId) {
      await wait(240);
      assertAvailable();
      getTaskOrThrow(taskId);
      runtime.status = "learning";
      runtime.progress = Math.max(runtime.progress, 12);
      return response({
        task: currentTask(),
        currentUnitIndex: runtime.currentUnitIndex,
        savedAt: new Date().toISOString()
      });
    },
    async completeUnit(taskId, unitId) {
      await wait(360);
      assertAvailable();
      getTaskOrThrow(taskId);
      if (!employeeCourseModules.some((module) => module.id === unitId)) {
        throw new MobileServiceError("NOT_FOUND", "未找到当前学习单元。");
      }
      runtime.currentUnitIndex = Math.min(
        runtime.currentUnitIndex + 1,
        employeeCourseModules.length - 1,
      );
      runtime.progress = Math.max(
        runtime.progress,
        Math.round(
          (runtime.currentUnitIndex / employeeCourseModules.length) * 100,
        ),
      );
      runtime.status = "learning";
      return response({
        task: currentTask(),
        currentUnitIndex: runtime.currentUnitIndex,
        savedAt: new Date().toISOString()
      });
    },
    async completeCourse(taskId, options) {
      await wait(360);
      assertAvailable();
      getTaskOrThrow(taskId);
      runtime.progress = 100;
      if (options?.remedial) {
        runtime.status = "reassessment";
        runtime.assessmentAttempt += 1;
      } else {
        runtime.status = "awaiting_assessment";
      }
      return response({
        task: currentTask(),
        currentUnitIndex: runtime.currentUnitIndex,
        savedAt: new Date().toISOString(),
        attempt: runtime.assessmentAttempt
      });
    }
  },
  tutor: {
    async getSession(taskId) {
      await wait(160);
      assertAvailable();
      getTaskOrThrow(taskId);
      return response({
        welcome:
          "我可以依据当前培训中的正式资料解释知识点。遇到高风险、资料冲突或依据不足的问题，我会明确提示并建议人工确认。",
        suggestions: [
          "进入高温区域前需要确认什么？",
          "为什么高风险知识必须单独达标？",
          "资料与现场要求不一致怎么办？"
        ]
      });
    },
    async ask(taskId, question) {
      await wait(620);
      assertAvailable();
      getTaskOrThrow(taskId);
      if (!question.trim()) {
        throw new MobileServiceError(
          "VALIDATION_ERROR",
          "请输入要咨询的问题。",
        );
      }
      if (runtime.failures.tutorFailuresRemaining > 0) {
        runtime.failures.tutorFailuresRemaining -= 1;
        throw new MobileServiceError(
          "NETWORK_ERROR",
          "回答暂时无法生成，请稍后重试。",
          true,
        );
      }
      if (
        question.includes("绩效") ||
        question.includes("岗位任免") ||
        question.includes("没有依据")
      ) {
        return response({
          id: `TA-${Date.now()}`,
          answer:
            "现有授权资料不足以支持该结论。培训结果用于学习闭环，不能直接推断绩效、晋升或岗位任免。如需进一步确认，请联系培训管理员。",
          kind: "refused",
          citationIds: []
        });
      }
      if (question.includes("现场") || question.includes("不一致")) {
        return response({
          id: `TA-${Date.now()}`,
          answer:
            "资料与现场要求不一致时，请停止相关操作，并由现场授权人员确认后再继续。不要依据个人经验选择其中一方。",
          kind: "manual",
          citationIds: ["K-STEEL-051"],
          highRiskNotice: "涉及现场安全，未确认前请勿继续操作。"
        });
      }
      return response({
        id: `TA-${Date.now()}`,
        answer:
          "进入高温区域前，应同时确认设备联锁状态、隔离边界和监护要求。三项条件中任何一项无法确认，都应停止操作并转人工确认。",
        kind: "supported",
        citationIds: ["K-STEEL-051"],
        highRiskNotice: "该内容属于高风险知识，需要在测评中单独达标。"
      });
    },
    async submitFeedback() {
      await wait(140);
      assertAvailable();
      return response({ saved: true as const });
    },
    async requestHumanHelp() {
      await wait(260);
      assertAvailable();
      return response({
        accepted: true as const,
        message: "人工帮助请求已提交，培训管理员会在消息中回复。"
      });
    }
  },
  assessment: {
    async getQuestions(taskId) {
      await wait(260);
      assertAvailable();
      getTaskOrThrow(taskId);
      return response(questions);
    },
    async getDraft(taskId, attempt) {
      await wait(120);
      assertAvailable();
      return response(runtime.drafts[draftKey(taskId, attempt)] ?? null);
    },
    async saveDraft(taskId, attempt, answers) {
      await wait(160);
      assertAvailable();
      getTaskOrThrow(taskId);
      const draft: AssessmentDraft = {
        taskId,
        attempt,
        answers,
        savedAt: new Date().toISOString(),
        storage: "synced"
      };
      runtime.drafts[draftKey(taskId, attempt)] = draft;
      return response(draft);
    },
    async submit(taskId, answers, attempt) {
      await wait(720);
      assertAvailable();
      getTaskOrThrow(taskId);
      const unanswered = questions.filter(
        (question) => !answers[question.id]?.length,
      );
      if (unanswered.length) {
        throw new MobileServiceError(
          "VALIDATION_ERROR",
          `还有 ${unanswered.length} 道题未完成。`,
        );
      }
      const submissionKey = draftKey(taskId, attempt);
      if (runtime.submittedAttempts.has(submissionKey)) {
        throw new MobileServiceError(
          "DUPLICATE_SUBMISSION",
          "本次测评已提交，请勿重复提交。",
        );
      }

      const correctness = Object.fromEntries(
        questions.map((question) => [
          question.id,
          sameAnswers(answers[question.id], question.correctOptionIndexes)
        ]),
      );
      const score =
        (correctness["Q-01"] ? 20 : 0) +
        (correctness["Q-02"] ? 40 : 0) +
        (correctness["Q-03"] ? 40 : 0);
      const passed = score >= 80;
      const highRiskPassed = Boolean(correctness["Q-01"]);
      const previousScore = runtime.result?.score;
      const nextAction =
        passed && highRiskPassed
          ? "complete"
          : attempt >= 3
            ? "human_review"
            : "remedial";
      const result: MobileAssessmentResult = {
        id: `AR-M-${attempt}-${Date.now()}`,
        taskId,
        attempt,
        score,
        passed,
        highRiskPassed,
        knowledgeResults: questions.map((question) =>
          resultForQuestion(question, Boolean(correctness[question.id])),
        ),
        nextAction,
        submittedAt: new Date().toISOString(),
        previousScore,
        scoreChange:
          previousScore === undefined ? undefined : score - previousScore,
        wrongAnswerReasons: questions
          .filter((question) => !correctness[question.id])
          .map((question) => ({
            questionId: question.id,
            knowledgePoint: question.knowledgePoint,
            reason:
              question.riskLevel === "high"
                ? "未同时选出联锁、隔离和监护要求。"
                : "选择项与正式资料中的判定口径不一致。",
            recommendation:
              question.riskLevel === "high"
                ? "重新学习高温作业前置条件，并完成场景练习。"
                : "复习对应知识说明后再次作答。"
          }))
      };

      runtime.submittedAttempts.add(submissionKey);
      runtime.result = result;
      if (nextAction === "complete") {
        runtime.status = "completed";
        runtime.completedAt = result.submittedAt;
      } else if (nextAction === "human_review") {
        runtime.status = "human_takeover";
      } else {
        runtime.status = "assessment_failed";
      }
      return response(result);
    },
    async getResult(taskId) {
      await wait(180);
      assertAvailable();
      getTaskOrThrow(taskId);
      if (taskId === completedTask.id) return response(seededCompletedResult);
      return response(runtime.result);
    },
    async listResults() {
      await wait(240);
      assertAvailable();
      return response(
        runtime.result
          ? [runtime.result, seededCompletedResult]
          : [seededCompletedResult],
      );
    }
  },
  remedial: {
    async getPlan(taskId) {
      await wait(260);
      assertAvailable();
      getTaskOrThrow(taskId);
      const weakPoints =
        runtime.result?.knowledgeResults
          .filter((item) => !item.passed)
          .map((item) => ({
            knowledgePoint: item.knowledgePoint,
            reason: item.reason,
            riskLevel: item.riskLevel
          })) ?? [];
      return response({
        taskId,
        title: "高风险知识定向补训",
        reason:
          "本次测评存在未达标知识点，需要补充学习后在同一任务内完成复测。",
        weakPoints: weakPoints.length
          ? weakPoints
          : [
              {
                knowledgePoint: "高温作业与设备联锁",
                reason: "高风险前置条件尚未完整掌握。",
                riskLevel: "high" as const
              }
            ],
        requirements: [
          "完成未达标知识点讲解",
          "完成一个现场场景练习",
          "补训完成后进入复测"
        ],
        nextStep: "补训完成后自动开放复测，不会直接标记培训完成。",
        currentStep: 1 as const
      });
    },
    async start(taskId) {
      await wait(220);
      assertAvailable();
      getTaskOrThrow(taskId);
      runtime.status = "remedial_learning";
      runtime.progress = 0;
      runtime.currentUnitIndex = 0;
      return response({ task: currentTask() });
    }
  },
  notifications: {
    async list() {
      await wait(220);
      assertAvailable();
      return response(
        runtime.notifications.map((item) => {
          if (
            runtime.status !== "completed" ||
            item.taskId !== primaryTaskBase.id
          ) {
            return { ...item };
          }

          if (item.id === "MSG-01") {
            return {
              ...item,
              title: "培训任务已完成",
              description: `最终测评 ${runtime.result?.score ?? 0} 分，学习、补训与复测记录已保存`,
              icon: "check-decagram-outline"
            };
          }

          if (item.id === "MSG-02") {
            return {
              ...item,
              title: "完成状态已同步",
              description: "本任务已在截止日期前完成，可在个人培训记录中查看",
              icon: "cloud-check-outline",
              unread: false
            };
          }

          return { ...item };
        }),
      );
    },
    async markRead(id) {
      await wait(120);
      assertAvailable();
      runtime.notifications = runtime.notifications.map((item) =>
        item.id === id ? { ...item, unread: false } : item,
      );
      return response({ saved: true as const });
    }
  },
  profile: {
    async getProfile() {
      await wait(180);
      assertAvailable();
      return response(employeeProfile);
    },
    async listTrainingRecords() {
      await wait(220);
      assertAvailable();
      return response(
        trainingRecordFixtures.map((record) =>
          record.id === primaryTaskBase.id
            ? {
                ...record,
                status:
                  runtime.status === "completed"
                    ? ("completed" as const)
                    : ("in_progress" as const),
                completedAt: runtime.completedAt,
                resultSummary:
                  runtime.status === "completed"
                    ? `测评 ${runtime.result?.score ?? 0} 分 · 已完成`
                    : nextActionFor(runtime.status)
              }
            : record,
        ),
      );
    }
  },
  citations: {
    async listByIds(ids) {
      await wait(220);
      assertAvailable();
      if (runtime.failures.citationUnavailable) {
        throw new MobileServiceError(
          "CONTENT_UNAVAILABLE",
          "知识来源暂时无法加载，请稍后重试。",
          true,
        );
      }
      const selected = ids?.length
        ? citations.filter((item) => ids.includes(item.id))
        : citations.filter((item) => item.department !== "智信部");
      if (!selected.length) {
        throw new MobileServiceError(
          "FORBIDDEN",
          "当前账号无权查看该资料。",
        );
      }
      return response(selected);
    }
  }
};

export const __mobileMockControl = {
  reset() {
    runtime = makeRuntime();
  },
  configure(failures: Partial<MockFailureConfig>) {
    runtime.failures = { ...runtime.failures, ...failures };
  },
  setTaskState(status: TrainingStatus, progress = runtime.progress) {
    runtime.status = status;
    runtime.progress = progress;
  },
  getSnapshot() {
    return {
      status: runtime.status,
      progress: runtime.progress,
      attempt: runtime.assessmentAttempt,
      result: runtime.result
    };
  }
};
