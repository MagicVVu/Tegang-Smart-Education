import { contractIds } from "@tegang/mock-data";
import { makeRequestId, traceIdForRequest, wait } from "@tegang/shared-utils";
import type {
  ContractAssessmentDraftView,
  ContractAssessmentQuestion,
  ContractAssessmentResultView,
  ContractKnowledgePointPerformance,
  ContractLearningRecordStatus,
  ContractNotificationItemView,
  ContractTrainingTaskStatus,
  ContractTrainingTaskView
} from "@tegang/types";
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
  type EmployeeTaskFilter,
  type MobileServices,
  type ServiceResponse
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
  task_status: ContractTrainingTaskStatus;
  learning_status: ContractLearningRecordStatus;
  progress_percent: number;
  current_unit_index: number;
  assessment_attempt: number;
  result: ContractAssessmentResultView | null;
  drafts: Record<string, ContractAssessmentDraftView>;
  submitted_attempts: Set<string>;
  notifications: ContractNotificationItemView[];
  completed_at?: string;
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
    task_status: "TB-IN-PROGRESS",
    learning_status: "LR-LEARNING",
    progress_percent: 36,
    current_unit_index: 0,
    assessment_attempt: 1,
    result: null,
    drafts: {},
    submitted_attempts: new Set<string>(),
    notifications: notificationFixtures.map((item) => ({ ...item })),
    failures: { ...defaultFailures }
  };
}

let runtime = makeRuntime();

function response<T>(data: T): ServiceResponse<T> {
  const request_id = makeRequestId();
  return {
    data,
    request_id,
    trace_id: traceIdForRequest(request_id),
    occurred_at: new Date().toISOString()
  };
}

function assertAvailable() {
  if (runtime.failures.networkOffline) {
    throw new MobileServiceError("NETWORK_ERROR", "网络连接不可用，请检查网络后重试。", true);
  }
  if (runtime.failures.sessionExpired) {
    throw new MobileServiceError("UNAUTHORIZED", "登录状态已失效，请重新登录。");
  }
}

function nextActionFor(status: ContractLearningRecordStatus): string {
  switch (status) {
    case "LR-PENDING": return "开始学习";
    case "LR-LEARNING": return "继续学习";
    case "LR-WAIT-ASSESSMENT": return "开始测评";
    case "LR-NOT-MET":
    case "LR-REMEDIAL": return "进入定向补训";
    case "LR-WAIT-RETEST":
    case "LR-RETESTING": return "开始复测";
    case "LR-COMPLETED": return "查看完成记录";
    case "LR-PAUSED": return "等待人工处理";
  }
}

function currentTask(): ContractTrainingTaskView {
  return {
    ...primaryTaskBase,
    task_status: runtime.task_status,
    learning_status: runtime.learning_status,
    progress_percent: runtime.progress_percent,
    next_action_label: nextActionFor(runtime.learning_status),
    availability_reason: runtime.learning_status === "LR-PAUSED"
      ? "当前任务等待授权人员处理，学习记录不会丢失。"
      : undefined
  };
}

function matchesFilter(task: ContractTrainingTaskView, filter: EmployeeTaskFilter): boolean {
  if (filter === "completed") return task.learning_status === "LR-COMPLETED";
  if (filter === "active") return ["LR-PENDING", "LR-LEARNING"].includes(task.learning_status);
  return !["LR-PENDING", "LR-LEARNING", "LR-COMPLETED"].includes(task.learning_status);
}

function getTaskOrThrow(task_id: string): ContractTrainingTaskView {
  if (task_id === primaryTaskBase.id) return currentTask();
  if (task_id === completedTask.id) return completedTask;
  throw new MobileServiceError("NOT_FOUND", "未找到该培训任务。");
}

function draftKey(task_id: string, attempt: number) {
  return `${task_id}:${attempt}`;
}

function sameAnswers(actual: number[] | undefined, expected: number[]) {
  if (!actual || actual.length !== expected.length) return false;
  return [...actual].sort((a, b) => a - b).every((value, index) =>
    value === [...expected].sort((a, b) => a - b)[index],
  );
}

function performance(question: ContractAssessmentQuestion, correct: boolean, index: number): ContractKnowledgePointPerformance {
  return {
    id: `kperf_01ARZ3NDEKTSV4RRFFQ69G5F${["AV", "AW", "AX"][index]}`,
    status: correct ? "LR-COMPLETED" : "LR-NOT-MET",
    assessment_session_id: "assessment_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    knowledge_point_id: question.knowledge_point_id,
    knowledge_point_name: question.knowledge_point_name,
    score_percent: correct ? 100 : 0,
    passed: correct,
    reason: correct ? "已正确识别本知识点的关键要求。" : "未完整识别正式资料中的判定条件。",
    risk_level: question.risk_level,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

const seededCompletedResult: ContractAssessmentResultView = {
  id: "assessment_result_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  assessment_session_id: "assessment_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  task_id: completedTask.id,
  employee_profile_id: contractIds.employeeProfile,
  attempt: 1,
  score_percent: 92,
  passed: true,
  high_risk_passed: true,
  knowledge_point_performances: [performance(questions[1]!, true, 1)],
  next_action: "complete",
  submitted_at: "2026-06-28T07:40:00Z",
  wrong_answer_reasons: [],
  disclaimer: "测评结果仅用于培训闭环，不得直接用于绩效、晋升、处罚或人事结论。"
};

export const mobileServices: MobileServices = {
  auth: {
    async login(credentials) {
      await wait(420);
      assertAvailable();
      const account = credentials.account.trim().toUpperCase();
      if (!account || credentials.password.length < 6) {
        throw new MobileServiceError("VALIDATION_ERROR", "请输入有效的账号和密码。");
      }
      if (account.startsWith("A-") || account.startsWith("ADMIN")) {
        throw new MobileServiceError("FORBIDDEN", "当前账号没有员工培训端访问权限。");
      }
      if (account !== employeeProfile.account_label) {
        throw new MobileServiceError("UNAUTHORIZED", "账号或密码不正确，请重新输入。");
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
      return response([currentTask(), completedTask].filter((task) => matchesFilter(task, filter)));
    },
    async getCurrentTask() {
      await wait(240);
      assertAvailable();
      return response(runtime.failures.emptyTasks ? null : currentTask());
    },
    async getTask(task_id) {
      await wait(220);
      assertAvailable();
      return response(getTaskOrThrow(task_id));
    }
  },
  learning: {
    async getCourse(task_id, options) {
      await wait(300);
      assertAvailable();
      getTaskOrThrow(task_id);
      if (runtime.failures.courseUnavailable) {
        throw new MobileServiceError("CONTENT_UNAVAILABLE", "课程内容暂时无法加载，请稍后重试。", true);
      }
      const is_remedial = Boolean(options?.remedial);
      const units = is_remedial
        ? [{
            id: contractIds.courseRemedial,
            title: "高温作业前置条件强化",
            duration_minutes: 15,
            risk_level: "high" as const,
            completed: false,
            ...remedialCopy
          }]
        : employeeCourseModules.map((course) => ({
            ...course,
            ...(courseCopy[course.id] ?? courseCopy[contractIds.courseBase]!)
          }));
      return response({
        task_id,
        title: is_remedial ? "定向补训" : currentTask().name,
        units,
        current_unit_index: is_remedial ? 0 : runtime.current_unit_index,
        content_version: "2026.07",
        is_remedial
      });
    },
    async start(task_id) {
      await wait(240);
      assertAvailable();
      getTaskOrThrow(task_id);
      runtime.learning_status = "LR-LEARNING";
      runtime.progress_percent = Math.max(runtime.progress_percent, 12);
      return response({ task: currentTask(), current_unit_index: runtime.current_unit_index, saved_at: new Date().toISOString() });
    },
    async completeUnit(task_id, unit_id) {
      await wait(360);
      assertAvailable();
      getTaskOrThrow(task_id);
      if (!employeeCourseModules.some((course) => course.id === unit_id)) {
        throw new MobileServiceError("NOT_FOUND", "未找到当前学习单元。");
      }
      runtime.current_unit_index = Math.min(runtime.current_unit_index + 1, employeeCourseModules.length - 1);
      runtime.progress_percent = Math.max(runtime.progress_percent, Math.round((runtime.current_unit_index / employeeCourseModules.length) * 100));
      runtime.learning_status = "LR-LEARNING";
      return response({ task: currentTask(), current_unit_index: runtime.current_unit_index, saved_at: new Date().toISOString() });
    },
    async completeCourse(task_id, options) {
      await wait(360);
      assertAvailable();
      getTaskOrThrow(task_id);
      runtime.progress_percent = 100;
      if (options?.remedial) {
        runtime.learning_status = "LR-RETESTING";
        runtime.assessment_attempt += 1;
      } else {
        runtime.learning_status = "LR-WAIT-ASSESSMENT";
      }
      return response({
        task: currentTask(),
        current_unit_index: runtime.current_unit_index,
        saved_at: new Date().toISOString(),
        attempt: runtime.assessment_attempt
      });
    }
  },
  tutor: {
    async getSession(task_id) {
      await wait(160);
      assertAvailable();
      getTaskOrThrow(task_id);
      return response({ welcome: "我会依据当前培训中的正式资料解释知识点。", suggestions: ["进入高温区域前需要确认什么？", "资料与现场要求不一致怎么办？"] });
    },
    async ask(task_id, question) {
      await wait(620);
      assertAvailable();
      getTaskOrThrow(task_id);
      if (!question.trim()) throw new MobileServiceError("VALIDATION_ERROR", "请输入要咨询的问题。");
      if (runtime.failures.tutorFailuresRemaining > 0) {
        runtime.failures.tutorFailuresRemaining -= 1;
        throw new MobileServiceError("NETWORK_ERROR", "回答暂时无法生成，请稍后重试。", true);
      }
      const suffix = makeRequestId().slice(4);
      if (question.includes("绩效") || question.includes("岗位任免")) {
        return response({ id: `answer_${suffix}`, answer: "培训测评不能直接推断绩效、晋升或岗位任免。", kind: "refused", knowledge_citation_ids: [] });
      }
      return response({
        id: `answer_${suffix}`,
        answer: "进入高温区域前，应同时确认设备联锁状态、隔离边界和监护要求。",
        kind: question.includes("现场") ? "manual" : "supported",
        knowledge_citation_ids: [contractIds.knowSteel],
        high_risk_notice: "该内容属于高风险知识，需在测评中单独达标。"
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
      return response({ accepted: true as const, message: "人工帮助请求已提交。" });
    }
  },
  assessment: {
    async getQuestions(task_id) {
      await wait(260);
      assertAvailable();
      getTaskOrThrow(task_id);
      return response(questions);
    },
    async getDraft(task_id, attempt) {
      await wait(120);
      assertAvailable();
      return response(runtime.drafts[draftKey(task_id, attempt)] ?? null);
    },
    async saveDraft(task_id, attempt, answers) {
      await wait(160);
      assertAvailable();
      getTaskOrThrow(task_id);
      const draft: ContractAssessmentDraftView = { task_id, attempt, answers, saved_at: new Date().toISOString(), storage: "synced" };
      runtime.drafts[draftKey(task_id, attempt)] = draft;
      return response(draft);
    },
    async submit(task_id, answers, attempt) {
      await wait(720);
      assertAvailable();
      getTaskOrThrow(task_id);
      const unanswered = questions.filter((question) => !answers[question.id]?.length);
      if (unanswered.length) throw new MobileServiceError("VALIDATION_ERROR", `还有 ${unanswered.length} 道题未完成。`);
      const key = draftKey(task_id, attempt);
      if (runtime.submitted_attempts.has(key)) throw new MobileServiceError("DUPLICATE_SUBMISSION", "本次测评已提交，请勿重复提交。");

      const correctness = questions.map((question) => sameAnswers(answers[question.id], question.correct_option_indexes));
      const score = (correctness[0] ? 20 : 0) + (correctness[1] ? 40 : 0) + (correctness[2] ? 40 : 0);
      const passed = score >= 80;
      const high_risk_passed = Boolean(correctness[0]);
      const previous_score_percent = runtime.result?.score_percent;
      const next_action = passed && high_risk_passed ? "complete" : attempt >= 3 ? "human_review" : "remediation";
      const suffix = makeRequestId().slice(4);
      const result: ContractAssessmentResultView = {
        id: `assessment_result_${suffix}`,
        assessment_session_id: `assessment_${suffix}`,
        task_id,
        employee_profile_id: contractIds.employeeProfile,
        attempt,
        score_percent: score,
        passed,
        high_risk_passed,
        knowledge_point_performances: questions.map((question, index) => performance(question, Boolean(correctness[index]), index)),
        next_action,
        submitted_at: new Date().toISOString(),
        previous_score_percent,
        score_change_percent: previous_score_percent === undefined ? undefined : score - previous_score_percent,
        wrong_answer_reasons: questions.filter((_, index) => !correctness[index]).map((question) => ({
          question_id: question.id,
          knowledge_point_id: question.knowledge_point_id,
          knowledge_point_name: question.knowledge_point_name,
          reason: "选择项与正式资料中的判定口径不一致。",
          recommendation: question.risk_level === "high" ? "重新学习高温作业前置条件。" : "复习对应知识说明后再次作答。"
        })),
        disclaimer: "测评结果仅用于培训闭环，不得直接用于绩效、晋升、处罚或人事结论。"
      };

      runtime.submitted_attempts.add(key);
      runtime.result = result;
      if (next_action === "complete") {
        runtime.learning_status = "LR-COMPLETED";
        runtime.task_status = "TB-COMPLETED";
        runtime.completed_at = result.submitted_at;
      } else if (next_action === "human_review") {
        runtime.learning_status = "LR-PAUSED";
        runtime.task_status = "TB-MANUAL";
      } else {
        runtime.learning_status = "LR-NOT-MET";
      }
      return response(result);
    },
    async getResult(task_id) {
      await wait(180);
      assertAvailable();
      getTaskOrThrow(task_id);
      return response(task_id === completedTask.id ? seededCompletedResult : runtime.result);
    },
    async listResults() {
      await wait(240);
      assertAvailable();
      return response(runtime.result ? [runtime.result, seededCompletedResult] : [seededCompletedResult]);
    }
  },
  remedial: {
    async getPlan(task_id) {
      await wait(260);
      assertAvailable();
      getTaskOrThrow(task_id);
      const failed = (runtime.result?.knowledge_point_performances ?? []).filter((item) => !item.passed);
      return response({
        task_id,
        title: "高风险知识定向补训",
        reason: "本次测评存在未达标知识点，需要补充学习后完成复测。",
        weak_points: (failed.length ? failed : [performance(questions[0]!, false, 0)]).map((item) => ({
          knowledge_point_id: item.knowledge_point_id,
          knowledge_point_name: item.knowledge_point_name,
          reason: item.reason,
          risk_level: item.risk_level
        })),
        requirements: ["完成未达标知识点讲解", "完成现场场景练习", "补训后进入复测"],
        next_step: "补训完成后开放复测，不直接标记培训完成。",
        current_step: 1
      });
    },
    async start(task_id) {
      await wait(220);
      assertAvailable();
      getTaskOrThrow(task_id);
      runtime.learning_status = "LR-REMEDIAL";
      runtime.progress_percent = 0;
      runtime.current_unit_index = 0;
      return response({ task: currentTask() });
    }
  },
  notifications: {
    async list() {
      await wait(220);
      assertAvailable();
      return response(runtime.notifications.map((item, index) => {
        if (runtime.learning_status !== "LR-COMPLETED") return { ...item };
        return index === 0
          ? { ...item, title: "培训任务已完成", description: `最终测评 ${runtime.result?.score_percent ?? 0} 分，记录已保存`, icon: "check-decagram-outline" }
          : { ...item, title: "完成状态已同步", description: "可在个人培训记录中查看", icon: "cloud-check-outline", unread: false };
      }));
    },
    async markRead(id) {
      await wait(120);
      assertAvailable();
      runtime.notifications = runtime.notifications.map((item) => item.id === id ? { ...item, unread: false } : item);
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
      return response(trainingRecordFixtures.map((record) => record.task_id === primaryTaskBase.id
        ? {
            ...record,
            learning_status: runtime.learning_status,
            completed_at: runtime.completed_at,
            result_summary: runtime.learning_status === "LR-COMPLETED"
              ? `测评 ${runtime.result?.score_percent ?? 0} 分 · 已完成`
              : nextActionFor(runtime.learning_status)
          }
        : record));
    }
  },
  citations: {
    async listByIds(ids) {
      await wait(220);
      assertAvailable();
      if (runtime.failures.citationUnavailable) throw new MobileServiceError("CONTENT_UNAVAILABLE", "知识来源暂时无法加载。", true);
      const selected = ids?.length ? citations.filter((item) => ids.includes(item.id)) : citations;
      if (!selected.length) throw new MobileServiceError("FORBIDDEN", "当前账号无权查看该资料。");
      return response(selected);
    }
  }
};

export const __mobileMockControl = {
  reset() { runtime = makeRuntime(); },
  configure(failures: Partial<MockFailureConfig>) { runtime.failures = { ...runtime.failures, ...failures }; },
  setTaskState(learning_status: ContractLearningRecordStatus, progress_percent = runtime.progress_percent) {
    runtime.learning_status = learning_status;
    runtime.progress_percent = progress_percent;
  },
  getSnapshot() {
    return {
      task_status: runtime.task_status,
      learning_status: runtime.learning_status,
      progress_percent: runtime.progress_percent,
      attempt: runtime.assessment_attempt,
      result: runtime.result
    };
  }
};
