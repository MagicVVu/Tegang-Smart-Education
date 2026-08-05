import {
  assessmentQuestions,
  candidatePlans,
  contractIds,
  demoUsers,
  knowledgeCitations,
  trainingTask
} from "@tegang/mock-data";
import type {
  ContractNotificationItemView,
  ContractPrototypeUserProfile,
  ContractTrainingRecordView,
  ContractTrainingTaskView
} from "@tegang/types";

export const employeeProfile: ContractPrototypeUserProfile =
  demoUsers.find((item) => item.role === "employee")!;

export const primaryTaskBase: Omit<
  ContractTrainingTaskView,
  "task_status" | "learning_status" | "progress_percent" | "next_action_label" | "availability_reason"
> = {
  ...trainingTask,
  department_name: employeeProfile.department_name,
  audience_label: `${employeeProfile.department_name}${employeeProfile.job_title}`,
  estimated_minutes: 90
};

export const completedTask: ContractTrainingTaskView = {
  ...trainingTask,
  id: contractIds.completedTask,
  name: "生产区域基础制度与行为规范",
  objective: "掌握生产区域基础制度、通行要求和异常报告流程。",
  department_name: employeeProfile.department_name,
  audience_label: `${employeeProfile.department_name}员工`,
  deadline: "2026-06-30",
  task_status: "TB-COMPLETED",
  learning_status: "LR-COMPLETED",
  progress_percent: 100,
  risk_level: "medium",
  estimated_minutes: 55,
  next_action_label: "查看完成记录",
  created_at: "2026-06-18T01:00:00Z"
};

export const employeeCourseModules = candidatePlans[1]!.courses.filter(
  (course) => course.department_name === "全员" || course.department_name === employeeProfile.department_name,
);

export const courseCopy: Record<string, {
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  key_points: string[];
  scenario_question: string;
  scenario_answer: string;
  knowledge_citation_ids: string[];
}> = {
  [contractIds.courseBase]: {
    eyebrow: "基础制度 · 必修",
    heading: "进入生产区域前的身份与安全确认",
    paragraphs: [
      "进入生产区域前，应完成规定的安全培训和身份确认，并了解当日作业区域、通行边界和异常报告方式。",
      "制度内容与现场要求不一致时，应暂停相关操作，向现场授权人员确认。"
    ],
    key_points: ["完成身份确认", "了解通行边界", "异常时停止并报告"],
    scenario_question: "现场要求与培训资料不一致时，应先做什么？",
    scenario_answer: "暂停相关操作，并向现场授权人员确认。",
    knowledge_citation_ids: [contractIds.knowBase]
  },
  [contractIds.courseSteel]: {
    eyebrow: "高风险知识 · 独立达标",
    heading: "进入高温区域前的联锁、隔离与监护",
    paragraphs: [
      "进入高温作业区域前，应确认设备联锁状态、隔离边界和监护要求。任何一项无法确认时必须停止。",
      "该知识点影响现场安全，必须在测评中单独达标。"
    ],
    key_points: ["确认设备联锁", "确认隔离边界", "确认监护要求"],
    scenario_question: "设备联锁状态无法确认时应如何处理？",
    scenario_answer: "停止操作并请求现场授权人员确认。",
    knowledge_citation_ids: [contractIds.knowSteel]
  }
};

export const remedialCopy = {
  eyebrow: "定向补训 · 高风险知识",
  heading: "高温作业前置条件强化",
  paragraphs: ["本次只补充未达标的高风险知识点。", "请再次核对联锁状态、隔离边界和监护要求。"],
  key_points: ["三项条件缺一不可", "资料冲突时停止操作", "完成后进入复测"],
  scenario_question: "有一项前置条件无法确认，能否继续进入作业区域？",
  scenario_answer: "不能，应停止操作并转人工确认。",
  knowledge_citation_ids: [contractIds.knowSteel]
};

export const questions = assessmentQuestions;
export const citations = knowledgeCitations;

export const notificationFixtures: ContractNotificationItemView[] = [
  {
    id: "notification_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    title: "当前培训待继续",
    description: "高风险安全规范培训还有学习内容未完成",
    created_at: "2026-08-04T01:20:00Z",
    icon: "book-open-page-variant-outline",
    unread: true,
    task_id: trainingTask.id,
    destination: "task"
  },
  {
    id: "notification_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    title: "培训任务即将到期",
    description: "请在 2026-08-15 前完成学习与测评",
    created_at: "2026-08-03T08:40:00Z",
    icon: "clock-alert-outline",
    unread: true,
    task_id: trainingTask.id,
    destination: "task"
  }
];

export const trainingRecordFixtures: ContractTrainingRecordView[] = [
  {
    task_id: completedTask.id,
    task_name: completedTask.name,
    learning_status: "LR-COMPLETED",
    completed_at: "2026-06-28T07:42:00Z",
    result_summary: "测评达标 · 高风险知识无单独要求"
  },
  {
    task_id: trainingTask.id,
    task_name: trainingTask.name,
    learning_status: "LR-LEARNING",
    result_summary: "学习进行中"
  }
];
