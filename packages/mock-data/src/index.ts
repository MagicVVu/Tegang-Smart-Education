import type {
  ContractAgentRun,
  ContractApproval,
  ContractAssessmentQuestion,
  ContractCoursePlanItem,
  ContractKnowledgeCitation,
  ContractPrototypeUserProfile,
  ContractReportSummary,
  ContractTrainingPlanDetail,
  ContractTrainingTaskView
} from "@tegang/types";

const CREATED_AT = "2026-07-28T01:30:00Z";
const UPDATED_AT = "2026-07-28T03:05:00Z";
const CONTENT_HASH = `sha256:${"a".repeat(64)}`;

const ids = {
  employeeUser: "usr_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  adminUser: "usr_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  reviewerUser: "usr_01ARZ3NDEKTSV4RRFFQ69G5FAX",
  systemUser: "usr_01ARZ3NDEKTSV4RRFFQ69G5FAY",
  employeeProfile: "emp_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  reviewerRole: "role_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  goal: "goal_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  task: "task_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  completedTask: "task_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  planA: "plan_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  planB: "plan_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  courseBase: "course_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  courseSteel: "course_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  courseIt: "course_01ARZ3NDEKTSV4RRFFQ69G5FAX",
  courseRemedial: "course_01ARZ3NDEKTSV4RRFFQ69G5FAY",
  kpBase: "kp_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  kpSteel: "kp_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  kpIt: "kp_01ARZ3NDEKTSV4RRFFQ69G5FAX",
  knowBase: "know_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  knowSteel: "know_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  knowIt: "know_01ARZ3NDEKTSV4RRFFQ69G5FAX",
  approval: "approval_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  run: "run_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  trace: "trc_01ARZ3NDEKTSV4RRFFQ69G5FAV"
} as const;

export const contractIds = ids;

export const demoUsers: ContractPrototypeUserProfile[] = [
  {
    user_id: ids.employeeUser,
    employee_profile_id: ids.employeeProfile,
    display_name: "员工 E-0231",
    role: "employee",
    department_name: "炼钢生产部",
    job_title: "新员工",
    account_label: "E-0231"
  },
  {
    user_id: ids.adminUser,
    display_name: "培训管理员 A-001",
    role: "training_admin",
    department_name: "培训管理",
    job_title: "培训管理员",
    account_label: "A-001"
  },
  {
    user_id: ids.reviewerUser,
    display_name: "审核员 R-001",
    role: "reviewer",
    department_name: "安全管理",
    job_title: "授权审核员",
    account_label: "R-001"
  },
  {
    user_id: ids.systemUser,
    display_name: "系统管理员 S-001",
    role: "system_admin",
    department_name: "智信部",
    job_title: "系统管理员",
    account_label: "S-001"
  }
];

export const knowledgeCitations: ContractKnowledgeCitation[] = [
  {
    id: ids.knowBase,
    status: "effective",
    document_name: "《新员工基础制度与行为规范》",
    document_version: "V3.2",
    section: "第 2 章 现场与行为规范",
    excerpt: "进入生产区域前应完成规定的安全培训和身份确认。",
    relation: "支撑全部新员工的统一必修内容与完成条件。",
    retrieved_at: UPDATED_AT,
    content_hash: CONTENT_HASH,
    authorized_scopes: ["training:read"],
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    risk_level: "medium"
  },
  {
    id: ids.knowSteel,
    status: "effective",
    document_name: "《炼钢生产部安全操作规范》",
    document_version: "V5.1",
    section: "5.1 高温作业与设备联锁",
    excerpt: "进入高温作业区域前，必须确认设备联锁、隔离边界和监护要求。",
    relation: "用于炼钢生产部高风险知识学习、测评和人工审批。",
    retrieved_at: UPDATED_AT,
    content_hash: CONTENT_HASH,
    authorized_scopes: ["training:read", "steel:safety:read"],
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    risk_level: "high"
  },
  {
    id: ids.knowIt,
    status: "effective",
    document_name: "《智信部信息安全管理办法》",
    document_version: "V2.4",
    section: "3.2 数据权限与账号使用",
    excerpt: "账号权限应与岗位职责匹配，禁止共享或绕过授权访问。",
    relation: "用于智信部新员工的信息安全路径和案例。",
    retrieved_at: UPDATED_AT,
    content_hash: CONTENT_HASH,
    authorized_scopes: ["training:read", "it:security:read"],
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    risk_level: "medium"
  }
];

export const trainingTask: ContractTrainingTaskView = {
  id: ids.task,
  training_goal_id: ids.goal,
  task_status: "TB-WAIT-CONFIRM",
  learning_status: "LR-LEARNING",
  current_plan_id: ids.planB,
  approval_id: ids.approval,
  name: "新员工高风险安全规范与岗位基础培训",
  objective: "完成基础制度、部门特色和高风险知识培训，形成可追溯的测评、补训与复测闭环。",
  department_name: "炼钢生产部",
  audience_label: "炼钢生产部与智信部新员工",
  department_names: ["智信部", "炼钢生产部"],
  audience_labels: ["智信部新员工", "炼钢生产部新员工"],
  mandatory_requirements: ["企业基础制度与行为规范", "部门特色知识", "学习测评与培训报告"],
  high_risk_requirements: ["高温作业与设备联锁前置知识独立达标"],
  deadline: "2026-08-15",
  risk_level: "high",
  progress_percent: 42,
  estimated_minutes: 90,
  next_action_label: "继续学习",
  created_at: CREATED_AT
};

const courses: ContractCoursePlanItem[] = [
  {
    id: ids.courseBase,
    title: "企业基础制度与行为规范",
    department_name: "全员",
    duration_minutes: 40,
    risk_level: "medium",
    completed: true,
    knowledge_point_ids: [ids.kpBase]
  },
  {
    id: ids.courseSteel,
    title: "炼钢高温作业与设备联锁",
    department_name: "炼钢生产部",
    duration_minutes: 50,
    risk_level: "high",
    completed: false,
    knowledge_point_ids: [ids.kpSteel]
  },
  {
    id: ids.courseIt,
    title: "智信部数据权限与账号安全",
    department_name: "智信部",
    duration_minutes: 30,
    risk_level: "medium",
    completed: false,
    knowledge_point_ids: [ids.kpIt]
  }
];

const ruleChecks = [
  {
    id: "rule_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    status: "passed" as const,
    rule_code: "MANDATORY_CONTENT_COMPLETE",
    label: "必修内容完整",
    detail: "必修课程与部门路径完整。",
    deterministic: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    risk_level: "medium" as const
  },
  {
    id: "rule_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    status: "warning" as const,
    rule_code: "HIGH_RISK_APPROVAL_REQUIRED",
    label: "高风险动作审批",
    detail: "正式下发前需审核员确认高风险范围和测评要求。",
    deterministic: true,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    risk_level: "high" as const
  }
];

export const candidatePlans: ContractTrainingPlanDetail[] = [
  {
    id: ids.planA,
    status: "candidate",
    training_goal_id: ids.goal,
    title: "标准分部门路径",
    candidate_label: "候选 A",
    summary: "统一基础课程后进入部门路径。",
    selection_reason: "覆盖完整、节奏平稳，但高风险强化出现较晚。",
    course_ids: courses.map((course) => course.id),
    knowledge_citation_ids: knowledgeCitations.map((citation) => citation.id),
    rule_checks: ruleChecks.slice(0, 1),
    target_department_names: trainingTask.department_names,
    courses: courses.map((course) => ({ ...course, completed: false })),
    knowledge_citations: knowledgeCitations,
    entity_version: 1,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    risk_level: "high"
  },
  {
    id: ids.planB,
    status: "candidate",
    training_goal_id: ids.goal,
    title: "风险前置的差异化路径",
    candidate_label: "候选 B · Agent 建议",
    summary: "基础制度后立即进入部门路径，炼钢员工优先完成高风险知识。",
    selection_reason: "缩短高风险暴露窗口，同时避免智信部学习无关现场细节。",
    course_ids: courses.map((course) => course.id),
    knowledge_citation_ids: knowledgeCitations.map((citation) => citation.id),
    rule_checks: ruleChecks,
    approval_id: ids.approval,
    target_department_names: trainingTask.department_names,
    courses,
    knowledge_citations: knowledgeCitations,
    entity_version: 2,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    risk_level: "high"
  }
];

export const approvalRecord: ContractApproval = {
  id: ids.approval,
  status: "AP-WAITING",
  task_id: ids.task,
  plan_id: ids.planB,
  requested_by: ids.adminUser,
  reviewer_role_id: ids.reviewerRole,
  risk_summary: "包含炼钢高温作业与设备联锁高风险知识。",
  impact_scope: ["炼钢生产部新员工"],
  knowledge_citation_ids: [ids.knowSteel],
  submitted_at: "2026-07-28T02:22:00Z",
  created_at: CREATED_AT,
  updated_at: UPDATED_AT,
  risk_level: "high"
};

export const assessmentQuestions: ContractAssessmentQuestion[] = [
  {
    id: "question_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    status: "active",
    question_type: "single",
    prompt: "进入高温作业区域前，第一项需要确认的内容是什么？",
    options: ["个人学习总分", "设备联锁状态、隔离边界和监护要求", "同事是否已经进入", "当天课程是否全部结束"],
    correct_option_indexes: [1],
    knowledge_point_id: ids.kpSteel,
    knowledge_point_name: "高温作业与设备联锁",
    risk_level: "high",
    created_at: CREATED_AT,
    updated_at: UPDATED_AT
  },
  {
    id: "question_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    status: "active",
    question_type: "multiple",
    prompt: "哪些内容属于可追溯培训证据？",
    options: ["知识引用", "测评答案", "审批记录", "未经确认的个人猜测"],
    correct_option_indexes: [0, 1, 2],
    knowledge_point_id: ids.kpBase,
    knowledge_point_name: "培训过程留痕",
    risk_level: "medium",
    created_at: CREATED_AT,
    updated_at: UPDATED_AT
  },
  {
    id: "question_01ARZ3NDEKTSV4RRFFQ69G5FAX",
    status: "active",
    question_type: "boolean",
    prompt: "单次测评结果可以直接作为绩效或岗位任免结论。",
    options: ["正确", "错误"],
    correct_option_indexes: [1],
    knowledge_point_id: ids.kpBase,
    knowledge_point_name: "能力判断边界",
    risk_level: "medium",
    created_at: CREATED_AT,
    updated_at: UPDATED_AT
  }
];

const stepBase = {
  run_id: ids.run,
  input_summary: "授权范围内的培训目标与上下文",
  retry_count: 0,
  writes_committed: false,
  created_at: CREATED_AT,
  updated_at: UPDATED_AT,
  risk_level: "medium" as const
};

export const agentRun: ContractAgentRun = {
  id: ids.run,
  status: "AR-WAIT-INPUT",
  task_id: ids.task,
  state: {
    id: ids.run,
    status: "AR-WAIT-INPUT",
    task_id: ids.task,
    current_plan_id: ids.planB,
    checkpoint_id: "checkpoint_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    retry_count: 0,
    waiting_for: "培训管理员确认",
    recoverable: true,
    formal_write_occurred: false,
    created_at: CREATED_AT,
    updated_at: UPDATED_AT,
    risk_level: "high"
  },
  steps: [
    {
      ...stepBase,
      id: "step_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      status: "succeeded",
      capability: "supervisor",
      label: "理解目标与建立上下文",
      output_summary: "形成受控任务节点与依赖",
      decision_reason: "目标和最小上下文完整，可进入诊断。",
      model_name: "demo-planner",
      prompt_version: "supervisor-v0.1",
      token_count: 1280,
      latency_ms: 1860,
      checkpoint_id: "checkpoint_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      started_at: "2026-07-28T01:31:00Z",
      finished_at: "2026-07-28T01:31:02Z"
    },
    {
      ...stepBase,
      id: "step_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      status: "succeeded",
      capability: "retrieval",
      label: "检索知识并校验版本",
      output_summary: "返回 3 条授权范围内的有效知识引用",
      skill_name: "retrieve_authorized_knowledge",
      latency_ms: 1440,
      checkpoint_id: "checkpoint_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      started_at: "2026-07-28T01:31:04Z",
      finished_at: "2026-07-28T01:31:06Z"
    },
    {
      ...stepBase,
      id: "step_01ARZ3NDEKTSV4RRFFQ69G5FAX",
      status: "succeeded",
      capability: "rules",
      label: "硬约束与风险校验",
      output_summary: "必修与权限通过，高风险动作等待人工审批",
      latency_ms: 290,
      checkpoint_id: "checkpoint_01ARZ3NDEKTSV4RRFFQ69G5FAX",
      started_at: "2026-07-28T01:31:10Z",
      finished_at: "2026-07-28T01:31:11Z",
      risk_level: "high"
    }
  ],
  decisions: [
    {
      id: "decision_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      status: "recorded",
      run_id: ids.run,
      title: "采用风险前置的部门化路径",
      summary: "炼钢生产部先完成高温作业知识，智信部进入数据权限案例。",
      evidence_ids: [ids.knowBase, ids.knowSteel, ids.knowIt],
      source: "agent_suggestion",
      created_at: CREATED_AT,
      updated_at: UPDATED_AT,
      risk_level: "high"
    },
    {
      id: "decision_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      status: "recorded",
      run_id: ids.run,
      title: "高风险正式下发需人工审批",
      summary: "确定性规则命中高风险要求，暂停正式写入。",
      evidence_ids: [ruleChecks[1]!.id],
      source: "deterministic_rule",
      created_at: CREATED_AT,
      updated_at: UPDATED_AT,
      risk_level: "high"
    }
  ],
  current_stage: "候选方案完成，等待培训管理员确认",
  trace_id: ids.trace,
  created_at: CREATED_AT,
  updated_at: UPDATED_AT,
  risk_level: "high"
};

export const reportSummary: ContractReportSummary = {
  task_id: ids.task,
  completion_rate_percent: 91,
  assessment_pass_rate_percent: 78,
  remedial_count: 5,
  reassessment_count: 4,
  high_risk_intervention_count: 3,
  status: "draft",
  disclaimer: "本页为代码型原型的演示数据，仅用于验证流程、页面与交互，不代表真实企业培训效果。"
};
