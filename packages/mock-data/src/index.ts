import type {
  AgentRun,
  ApprovalRecord,
  AssessmentQuestion,
  DemoUser,
  KnowledgeCitation,
  ReportSummary,
  TrainingPlan,
  TrainingTask
} from "@tegang/types";

export const demoUsers: DemoUser[] = [
  {
    id: "EMP-E0231",
    displayName: "员工 E-0231",
    role: "employee",
    department: "炼钢生产部",
    title: "新员工"
  },
  {
    id: "ADM-A001",
    displayName: "培训管理员 A-001",
    role: "training_admin",
    department: "培训管理",
    title: "培训管理员"
  },
  {
    id: "REV-R001",
    displayName: "审核员 R-001",
    role: "reviewer",
    department: "安全管理",
    title: "授权审核员"
  },
  {
    id: "SYS-S001",
    displayName: "系统管理员 S-001",
    role: "system_admin",
    department: "智信部",
    title: "系统管理员"
  }
];

export const knowledgeCitations: KnowledgeCitation[] = [
  {
    id: "K-BASE-032",
    documentName: "《新员工基础制度与行为规范》",
    version: "V3.2",
    department: "企业级",
    section: "第 2 章 现场与行为规范",
    excerpt: "进入生产区域前应完成规定的安全培训和身份确认。",
    validity: "effective",
    relation: "支撑全部新员工的统一必修内容与完成条件。"
  },
  {
    id: "K-STEEL-051",
    documentName: "《炼钢生产部安全操作规范》",
    version: "V5.1",
    department: "炼钢生产部",
    section: "4.3 高温作业与设备联锁",
    excerpt: "高温区域作业前必须确认联锁状态、隔离边界和监护要求。",
    validity: "effective",
    relation: "用于炼钢生产部高风险知识强化和独立达标判断。"
  },
  {
    id: "K-IT-024",
    documentName: "《智信部信息安全管理办法》",
    version: "V2.4",
    department: "智信部",
    section: "3.2 数据权限与账号使用",
    excerpt: "账号权限应与岗位职责匹配，禁止共享或绕过授权访问。",
    validity: "effective",
    relation: "用于智信部新员工的信息安全路径和案例。"
  }
];

export const trainingTask: TrainingTask = {
  id: "T-20260728-01",
  name: "新员工高风险安全规范与岗位基础培训",
  objective:
    "使智信部与炼钢生产部新员工完成基础制度、部门特色和高风险知识培训，并形成可追溯的测评、补训与复测闭环。",
  departments: ["智信部", "炼钢生产部"],
  audience: ["智信部新员工", "炼钢生产部新员工"],
  deadline: "2026-08-15",
  mandatoryRequirements: [
    "企业基础制度与行为规范",
    "部门特色知识",
    "学习测评与培训报告"
  ],
  highRiskRequirements: ["高温作业与设备联锁前置知识独立达标"],
  status: "awaiting_admin_confirmation",
  riskLevel: "high",
  progress: 42,
  currentPlanId: "PLAN-02",
  approvalId: "AP-20260728-01",
  createdAt: "2026-07-28T09:30:00+08:00"
};

export const candidatePlans: TrainingPlan[] = [
  {
    id: "PLAN-01",
    version: 1,
    title: "标准分部门路径",
    candidateLabel: "候选 A",
    summary: "统一基础课程后进入部门路径，适合时间充足的标准入职周期。",
    targetDepartments: ["智信部", "炼钢生产部"],
    selectionReason: "覆盖完整、节奏平稳，但炼钢高风险强化出现较晚。",
    riskLevel: "high",
    citations: knowledgeCitations,
    modules: [
      {
        id: "M-BASE",
        title: "企业基础制度与行为规范",
        department: "全员",
        durationMinutes: 45,
        riskLevel: "medium",
        completed: false,
        knowledgePointIds: ["KP-BASE"]
      },
      {
        id: "M-IT",
        title: "智信部数据权限与账号安全",
        department: "智信部",
        durationMinutes: 35,
        riskLevel: "medium",
        completed: false,
        knowledgePointIds: ["KP-IT"]
      },
      {
        id: "M-STEEL",
        title: "炼钢高温作业与设备联锁",
        department: "炼钢生产部",
        durationMinutes: 55,
        riskLevel: "high",
        completed: false,
        knowledgePointIds: ["KP-STEEL"]
      }
    ],
    ruleChecks: [
      {
        id: "RC-01",
        label: "必修内容完整",
        result: "passed",
        detail: "企业制度和两个部门必修均已覆盖。",
        deterministic: true
      },
      {
        id: "RC-02",
        label: "高风险知识覆盖",
        result: "passed",
        detail: "炼钢高风险知识已配置独立测评。",
        deterministic: true
      }
    ]
  },
  {
    id: "PLAN-02",
    version: 2,
    title: "风险前置的差异化路径",
    candidateLabel: "候选 B · Agent建议",
    summary:
      "基础制度完成后立即进入部门路径；炼钢员工先完成高风险知识，智信部员工进入数据权限案例。",
    targetDepartments: ["智信部", "炼钢生产部"],
    selectionReason:
      "将炼钢高风险知识前置，缩短风险暴露窗口；智信部无需学习无关现场细节。",
    riskLevel: "high",
    citations: knowledgeCitations,
    modules: [
      {
        id: "M-BASE",
        title: "企业基础制度与行为规范",
        department: "全员",
        durationMinutes: 40,
        riskLevel: "medium",
        completed: true,
        knowledgePointIds: ["KP-BASE"]
      },
      {
        id: "M-STEEL",
        title: "炼钢高温作业与设备联锁",
        department: "炼钢生产部",
        durationMinutes: 50,
        riskLevel: "high",
        completed: false,
        knowledgePointIds: ["KP-STEEL"]
      },
      {
        id: "M-IT",
        title: "智信部数据权限与账号安全",
        department: "智信部",
        durationMinutes: 30,
        riskLevel: "medium",
        completed: false,
        knowledgePointIds: ["KP-IT"]
      }
    ],
    ruleChecks: [
      {
        id: "RC-01",
        label: "必修内容完整",
        result: "passed",
        detail: "必修课程与部门路径完整。",
        deterministic: true
      },
      {
        id: "RC-02",
        label: "高风险知识前置",
        result: "passed",
        detail: "炼钢高风险模块安排在现场任务前。",
        deterministic: true
      },
      {
        id: "RC-03",
        label: "高风险动作审批",
        result: "warning",
        detail: "正式下发前需审核员确认高风险范围和测评要求。",
        deterministic: true
      }
    ]
  }
];

export const approvalRecord: ApprovalRecord = {
  id: "AP-20260728-01",
  taskId: trainingTask.id,
  status: "pending",
  createdAt: "2026-07-28T10:22:00+08:00"
};

export const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: "Q-01",
    type: "single",
    prompt: "进入高温作业区域前，第一项需要确认的内容是什么？",
    options: [
      "个人学习总分",
      "设备联锁状态、隔离边界和监护要求",
      "同事是否已经进入",
      "当天课程是否全部结束"
    ],
    correctOptionIndexes: [1],
    knowledgePoint: "高温作业与设备联锁",
    riskLevel: "high"
  },
  {
    id: "Q-02",
    type: "multiple",
    prompt: "以下哪些内容属于可追溯培训证据？",
    options: ["知识引用", "测评答案", "审批记录", "未经确认的个人猜测"],
    correctOptionIndexes: [0, 1, 2],
    knowledgePoint: "培训过程留痕",
    riskLevel: "medium"
  },
  {
    id: "Q-03",
    type: "boolean",
    prompt: "单次测评结果可以直接作为绩效或岗位任免结论。",
    options: ["正确", "错误"],
    correctOptionIndexes: [1],
    knowledgePoint: "能力边界",
    riskLevel: "medium"
  }
];

export const agentRun: AgentRun = {
  id: "RUN-20260728-01",
  taskId: trainingTask.id,
  status: "awaiting_admin_confirmation",
  currentStage: "候选方案完成，等待管理员确认",
  waitingFor: "培训管理员",
  traceId: "trace-demo-20260728-01",
  nodes: [
    {
      id: "N-01",
      label: "理解目标与建立上下文",
      capability: "supervisor",
      status: "succeeded",
      startedAt: "2026-07-28T09:31:00+08:00",
      finishedAt: "2026-07-28T09:31:02+08:00",
      inputSummary: "培训目标、对象、期限和高风险要求",
      outputSummary: "形成 9 个受控任务节点及依赖",
      decisionReason: "目标和最小上下文完整，可进入诊断。",
      model: "demo-planner",
      promptVersion: "supervisor-v0.1",
      tokens: 1280,
      latencyMs: 1860,
      retryCount: 0,
      checkpointId: "CP-01"
    },
    {
      id: "N-02",
      label: "读取组织与员工上下文",
      capability: "diagnosis",
      status: "succeeded",
      startedAt: "2026-07-28T09:31:02+08:00",
      finishedAt: "2026-07-28T09:31:04+08:00",
      inputSummary: "智信部与炼钢生产部授权范围",
      outputSummary: "形成部门差异和基础缺口摘要",
      model: "demo-diagnosis",
      promptVersion: "diagnosis-v0.1",
      tokens: 920,
      latencyMs: 2010,
      skillName: "read_employee_context",
      retryCount: 0,
      checkpointId: "CP-02"
    },
    {
      id: "N-03",
      label: "检索知识并校验版本",
      capability: "retrieval",
      status: "succeeded",
      startedAt: "2026-07-28T09:31:04+08:00",
      finishedAt: "2026-07-28T09:31:06+08:00",
      inputSummary: "部门、岗位、必修和高风险知识点",
      outputSummary: "返回 3 条现行有效知识引用",
      skillName: "retrieve_authorized_knowledge",
      latencyMs: 1440,
      retryCount: 0,
      checkpointId: "CP-03"
    },
    {
      id: "N-04",
      label: "生成并比较候选方案",
      capability: "planning",
      status: "succeeded",
      startedAt: "2026-07-28T09:31:06+08:00",
      finishedAt: "2026-07-28T09:31:10+08:00",
      inputSummary: "诊断、知识和硬约束",
      outputSummary: "生成标准路径与风险前置路径",
      decisionReason: "建议选择风险前置路径，但需人工确认。",
      model: "demo-planner",
      promptVersion: "planning-v0.2",
      tokens: 2350,
      latencyMs: 4020,
      retryCount: 0,
      checkpointId: "CP-04"
    },
    {
      id: "N-05",
      label: "硬约束与风险校验",
      capability: "rules",
      status: "succeeded",
      startedAt: "2026-07-28T09:31:10+08:00",
      finishedAt: "2026-07-28T09:31:11+08:00",
      inputSummary: "候选 B 方案、规则版本 R-0.1",
      outputSummary: "必修与权限通过；风险等级为高",
      latencyMs: 290,
      retryCount: 0,
      checkpointId: "CP-05"
    }
  ],
  decisions: [
    {
      id: "D-01",
      title: "采用风险前置的部门化路径",
      summary:
        "炼钢生产部先完成高温作业知识，智信部进入数据权限案例；两组共享企业基础制度。",
      evidenceIds: ["K-BASE-032", "K-STEEL-051", "K-IT-024"],
      source: "agent_suggestion"
    },
    {
      id: "D-02",
      title: "高风险正式下发需人工审批",
      summary: "规则检测到炼钢高风险知识要求，暂停正式写入。",
      evidenceIds: ["RC-03"],
      source: "deterministic_rule"
    }
  ]
};

export const reportSummary: ReportSummary = {
  taskId: trainingTask.id,
  completionRate: 91,
  assessmentPassRate: 78,
  remedialCount: 5,
  reassessmentCount: 4,
  highRiskInterventions: 3,
  status: "draft",
  disclaimer:
    "本页为代码型原型的演示数据，只用于验证流程、页面与交互，不代表真实企业培训效果。"
};
