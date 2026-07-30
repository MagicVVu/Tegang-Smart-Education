import {
  assessmentQuestions,
  candidatePlans,
  demoUsers,
  knowledgeCitations,
  trainingTask
} from "@tegang/mock-data";
import type {
  EmployeeProfile,
  EmployeeTrainingTask,
  NotificationItem,
  TrainingRecord
} from "./contracts";

export const employeeProfile: EmployeeProfile = {
  id: demoUsers.find((item) => item.role === "employee")?.id ?? "EMP-E0231",
  displayName:
    demoUsers.find((item) => item.role === "employee")?.displayName ??
    "员工 E-0231",
  department:
    demoUsers.find((item) => item.role === "employee")?.department ??
    "炼钢生产部",
  title:
    demoUsers.find((item) => item.role === "employee")?.title ?? "新员工",
  accountLabel: "E-0231"
};

export const primaryTaskBase: Omit<
  EmployeeTrainingTask,
  "status" | "progress" | "nextActionLabel" | "availabilityReason"
> = {
  id: trainingTask.id,
  name: trainingTask.name,
  objective: trainingTask.objective,
  department: employeeProfile.department,
  audienceLabel: `${employeeProfile.department}${employeeProfile.title}`,
  deadline: trainingTask.deadline,
  riskLevel: trainingTask.riskLevel,
  estimatedMinutes: 90
};

export const completedTask: EmployeeTrainingTask = {
  id: "T-20260618-02",
  name: "生产区域基础制度与行为规范",
  objective: "掌握生产区域基础制度、通行要求和异常报告流程。",
  department: employeeProfile.department,
  audienceLabel: `${employeeProfile.department}员工`,
  deadline: "2026-06-30",
  status: "completed",
  progress: 100,
  riskLevel: "medium",
  estimatedMinutes: 55,
  nextActionLabel: "查看完成记录"
};

export const employeeCourseModules = candidatePlans[1]!.modules.filter(
  (module) =>
    module.department === "全员" ||
    module.department === employeeProfile.department,
);

export const courseCopy = {
  "M-BASE": {
    eyebrow: "基础制度 · 必修",
    heading: "进入生产区域前的身份与安全确认",
    paragraphs: [
      "进入生产区域前，应完成规定的安全培训和身份确认，并确认本人了解当日作业区域、通行边界和异常报告方式。",
      "遇到制度内容与现场要求不一致时，应暂停相关操作，向现场授权人员确认，不依据个人经验自行处理。"
    ],
    keyPoints: ["完成身份确认", "了解通行边界", "异常时停止并报告"],
    scenarioQuestion: "现场要求与培训资料描述不一致时，应先做什么？",
    scenarioAnswer: "暂停相关操作，并向现场授权人员确认。",
    citationIds: ["K-BASE-032"]
  },
  "M-STEEL": {
    eyebrow: "高风险知识 · 独立达标",
    heading: "进入高温区域前的联锁、隔离与监护",
    paragraphs: [
      "进入高温作业区域前，应确认设备联锁状态、隔离边界和监护要求。任何一项无法确认时，应停止继续操作并转人工确认。",
      "该知识点影响现场安全，必须在测评中单独达标。其他知识点得分不能替代本项要求。"
    ],
    keyPoints: ["确认设备联锁", "确认隔离边界", "确认监护要求"],
    scenarioQuestion: "如果设备联锁状态无法确认，应如何处理？",
    scenarioAnswer: "停止操作并请求现场授权人员确认。",
    citationIds: ["K-STEEL-051"]
  }
} as const;

export const remedialCopy = {
  eyebrow: "定向补训 · 高风险知识",
  heading: "高温作业前置条件强化",
  paragraphs: [
    "本次只补充未达标的高风险知识点，不会重新开始全部课程。",
    "请再次核对联锁状态、隔离边界和监护要求。任一条件不明确时，必须停止操作并转人工确认。"
  ],
  keyPoints: ["三项条件缺一不可", "资料冲突时停止操作", "完成后进入复测"],
  scenarioQuestion: "三项前置条件中有一项无法确认，能否继续进入作业区域？",
  scenarioAnswer: "不能。应停止操作并转人工确认。",
  citationIds: ["K-STEEL-051"]
};

export const questions = assessmentQuestions;
export const citations = knowledgeCitations;

export const notificationFixtures: NotificationItem[] = [
  {
    id: "MSG-01",
    title: "当前培训待继续",
    description: "高风险安全规范培训还有学习内容未完成",
    createdAt: "今天 09:20",
    icon: "book-open-page-variant-outline",
    unread: true,
    taskId: trainingTask.id,
    destination: "task"
  },
  {
    id: "MSG-02",
    title: "培训任务即将到期",
    description: "请在 2026-08-15 前完成学习与测评",
    createdAt: "昨天 16:40",
    icon: "clock-alert-outline",
    unread: true,
    taskId: trainingTask.id,
    destination: "task"
  },
  {
    id: "MSG-03",
    title: "知识资料版本已确认",
    description: "《炼钢生产部安全操作规范》V5.1 现行有效",
    createdAt: "07-28 11:05",
    icon: "book-check-outline",
    unread: false,
    taskId: trainingTask.id,
    destination: "task"
  }
];

export const trainingRecordFixtures: TrainingRecord[] = [
  {
    id: completedTask.id,
    taskName: completedTask.name,
    status: "completed",
    completedAt: "2026-06-28 15:42",
    resultSummary: "测评达标 · 高风险知识无单独要求"
  },
  {
    id: trainingTask.id,
    taskName: trainingTask.name,
    status: "in_progress",
    resultSummary: "学习进行中"
  }
];
