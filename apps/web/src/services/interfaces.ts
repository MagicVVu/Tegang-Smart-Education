import type {
  ContractAgentRun,
  ContractApiEnvelope,
  ContractApproval,
  ContractApprovalDecision,
  ContractAssessmentQuestion,
  ContractAssessmentResultView,
  ContractPrototypeUserProfile,
  ContractRealtimeEvent,
  ContractReportSummary,
  ContractTrainingPlanDetail,
  ContractTrainingTaskStatus,
  ContractTrainingTaskView,
  ContractUserRole
} from "@tegang/types";

export type ServiceResponse<T> = ContractApiEnvelope & { data: T };

export interface AuthCredentials {
  account: string;
  password: string;
}

export interface AuthSession {
  user: ContractPrototypeUserProfile;
  authenticated_at: string;
  expires_at: string;
}

export interface AuthService {
  login(credentials: AuthCredentials): Promise<ServiceResponse<AuthSession>>;
  developmentLogin(role: ContractUserRole): Promise<ServiceResponse<AuthSession>>;
  listDevelopmentProfiles(): Promise<ContractPrototypeUserProfile[]>;
}

export interface TrainingService {
  listTasks(role: ContractUserRole): Promise<ServiceResponse<ContractTrainingTaskView[]>>;
  getTask(task_id: string): Promise<ServiceResponse<ContractTrainingTaskView>>;
  createTask(input: Partial<ContractTrainingTaskView>): Promise<ServiceResponse<ContractTrainingTaskView>>;
  publishTask(task_id: string): Promise<ServiceResponse<ContractTrainingTaskView>>;
}

export interface ApprovalService {
  getApproval(task_id: string): Promise<ServiceResponse<ContractApproval>>;
  decide(
    approval_id: string,
    decision: ContractApprovalDecision,
    comment: string,
  ): Promise<ServiceResponse<ContractApproval>>;
}

export interface AssessmentService {
  getQuestions(task_id: string): Promise<ServiceResponse<ContractAssessmentQuestion[]>>;
  submit(
    task_id: string,
    answers: Record<string, number[]>,
    attempt: number,
  ): Promise<ServiceResponse<ContractAssessmentResultView>>;
}

export interface KnowledgeService {
  search(query: string): Promise<{
    knowledge_citation_ids: string[];
    refused: boolean;
    message: string;
  }>;
}

export interface TrainingPlanService {
  list(task_id: string): Promise<ServiceResponse<ContractTrainingPlanDetail[]>>;
  requestReplan(
    task_id: string,
    reason: string,
    idempotency_key: string,
  ): Promise<ServiceResponse<{
    accepted: boolean;
    run_id: string;
    status: Extract<ContractTrainingTaskStatus, "TB-ANALYZING">;
  }>>;
}

export interface ReportService {
  getSummary(task_id: string): Promise<ServiceResponse<ContractReportSummary>>;
  requestExport(task_id: string, format: "pdf" | "xlsx"): Promise<ServiceResponse<{
    accepted: boolean;
    operation_id: string;
    message: string;
  }>>;
}

export interface AgentRunService {
  getRun(task_id: string): Promise<ServiceResponse<ContractAgentRun>>;
  getEvents(run_id: string): Promise<ServiceResponse<ContractRealtimeEvent[]>>;
  retry(run_id: string): Promise<ServiceResponse<ContractAgentRun>>;
  rollback(run_id: string): Promise<ServiceResponse<ContractAgentRun>>;
  requestHumanTakeover(run_id: string): Promise<ServiceResponse<ContractAgentRun>>;
}
