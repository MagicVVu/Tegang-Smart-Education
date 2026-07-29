export type UserRole =
  | "employee"
  | "training_admin"
  | "reviewer"
  | "system_admin";

export type DemoScenario =
  | "normal"
  | "high_risk"
  | "information_missing"
  | "assessment_failed"
  | "knowledge_conflict"
  | "agent_failure";

export type TrainingStatus =
  | "draft"
  | "information_missing"
  | "agent_analyzing"
  | "plan_generated"
  | "awaiting_admin_confirmation"
  | "awaiting_approval"
  | "approval_modification"
  | "approval_rejected"
  | "awaiting_publish"
  | "executing"
  | "learning"
  | "awaiting_assessment"
  | "assessment_failed"
  | "remedial_learning"
  | "reassessment"
  | "completed"
  | "execution_failed"
  | "paused"
  | "human_takeover"
  | "cancelled";

export type RiskLevel = "low" | "medium" | "high";
export type ApprovalDecision =
  | "approved"
  | "approved_with_changes"
  | "rejected"
  | "returned_for_information";

export interface DemoUser {
  id: string;
  displayName: string;
  role: UserRole;
  department: string;
  title: string;
}

export interface KnowledgeCitation {
  id: string;
  documentName: string;
  version: string;
  department: string;
  section: string;
  excerpt: string;
  validity: "effective" | "conflict" | "expired";
  relation: string;
}

export interface LearningModule {
  id: string;
  title: string;
  department: string;
  durationMinutes: number;
  riskLevel: RiskLevel;
  completed: boolean;
  knowledgePointIds: string[];
}

export interface TrainingPlan {
  id: string;
  version: number;
  title: string;
  summary: string;
  targetDepartments: string[];
  candidateLabel: string;
  selectionReason: string;
  modules: LearningModule[];
  citations: KnowledgeCitation[];
  riskLevel: RiskLevel;
  ruleChecks: RuleCheck[];
}

export interface RuleCheck {
  id: string;
  label: string;
  result: "passed" | "blocked" | "warning";
  detail: string;
  deterministic: true;
}

export interface TrainingTask {
  id: string;
  name: string;
  objective: string;
  departments: string[];
  audience: string[];
  deadline: string;
  mandatoryRequirements: string[];
  highRiskRequirements: string[];
  status: TrainingStatus;
  riskLevel: RiskLevel;
  progress: number;
  currentPlanId?: string;
  approvalId?: string;
  createdAt: string;
}

export interface ApprovalRecord {
  id: string;
  taskId: string;
  status:
    | "pending"
    | "approved"
    | "approved_with_changes"
    | "rejected"
    | "returned";
  reviewerId?: string;
  comment?: string;
  requestedChanges?: string[];
  createdAt: string;
  decidedAt?: string;
}

export interface AssessmentQuestion {
  id: string;
  type: "single" | "multiple" | "boolean";
  prompt: string;
  options: string[];
  correctOptionIndexes: number[];
  knowledgePoint: string;
  riskLevel: RiskLevel;
}

export interface KnowledgeResult {
  knowledgePoint: string;
  score: number;
  passed: boolean;
  riskLevel: RiskLevel;
  reason: string;
}

export interface AssessmentResult {
  id: string;
  taskId: string;
  attempt: number;
  score: number;
  passed: boolean;
  highRiskPassed: boolean;
  knowledgeResults: KnowledgeResult[];
  nextAction: "complete" | "remedial" | "human_review";
}

export interface AgentTraceNode {
  id: string;
  label: string;
  capability:
    | "supervisor"
    | "diagnosis"
    | "retrieval"
    | "planning"
    | "rules"
    | "approval"
    | "skill"
    | "assessment"
    | "report";
  status: "pending" | "running" | "succeeded" | "failed" | "paused";
  startedAt?: string;
  finishedAt?: string;
  inputSummary: string;
  outputSummary: string;
  decisionReason?: string;
  model?: string;
  promptVersion?: string;
  tokens?: number;
  latencyMs?: number;
  skillName?: string;
  errorCode?: string;
  retryCount: number;
  checkpointId?: string;
}

export interface AgentRun {
  id: string;
  taskId: string;
  status: TrainingStatus;
  currentStage: string;
  waitingFor?: string;
  traceId: string;
  nodes: AgentTraceNode[];
  decisions: Array<{
    id: string;
    title: string;
    summary: string;
    evidenceIds: string[];
    source: "agent_suggestion" | "deterministic_rule" | "human_decision";
  }>;
}

export interface ReportSummary {
  taskId: string;
  completionRate: number;
  assessmentPassRate: number;
  remedialCount: number;
  reassessmentCount: number;
  highRiskInterventions: number;
  status: "draft" | "awaiting_confirmation" | "confirmed";
  disclaimer: string;
}

export interface ServiceResponse<T> {
  data: T;
  requestId: string;
  timestamp: string;
}

export interface ServiceError {
  code:
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "KNOWLEDGE_CONFLICT"
    | "SKILL_FAILED"
    | "NETWORK_ERROR";
  message: string;
  retryable: boolean;
  requestId: string;
}

export interface TrainingService {
  listTasks(role: UserRole): Promise<ServiceResponse<TrainingTask[]>>;
  getTask(taskId: string): Promise<ServiceResponse<TrainingTask>>;
  createTask(
    input: Omit<TrainingTask, "id" | "status" | "progress" | "createdAt">,
  ): Promise<ServiceResponse<TrainingTask>>;
  publishTask(taskId: string): Promise<ServiceResponse<TrainingTask>>;
}

export interface ApprovalService {
  getApproval(taskId: string): Promise<ServiceResponse<ApprovalRecord>>;
  decide(
    approvalId: string,
    decision: ApprovalDecision,
    comment: string,
  ): Promise<ServiceResponse<ApprovalRecord>>;
}

export interface AssessmentService {
  getQuestions(taskId: string): Promise<ServiceResponse<AssessmentQuestion[]>>;
  submit(
    taskId: string,
    answers: Record<string, number[]>,
    attempt: number,
  ): Promise<ServiceResponse<AssessmentResult>>;
}

export interface AgentTraceService {
  getRun(taskId: string): Promise<ServiceResponse<AgentRun>>;
  retry(runId: string): Promise<ServiceResponse<AgentRun>>;
  rollback(runId: string): Promise<ServiceResponse<AgentRun>>;
  requestHumanTakeover(runId: string): Promise<ServiceResponse<AgentRun>>;
}
