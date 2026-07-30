export type {
  AgentTraceService,
  ApprovalService,
  AssessmentService,
  TrainingService
} from "@tegang/types";
import type {
  AgentRun,
  DemoUser,
  ReportSummary,
  ServiceResponse,
  TrainingPlan,
  UserRole
} from "@tegang/types";

export interface AuthCredentials {
  account: string;
  password: string;
}

export interface AuthSession {
  user: DemoUser;
  authenticatedAt: string;
  expiresAt: string;
}

export interface AuthService {
  login(credentials: AuthCredentials): Promise<ServiceResponse<AuthSession>>;
  developmentLogin(role: UserRole): Promise<ServiceResponse<AuthSession>>;
  listDevelopmentProfiles(): Promise<DemoUser[]>;
}

export interface KnowledgeService {
  search(query: string): Promise<{
    citationIds: string[];
    refused: boolean;
    message: string;
  }>;
}

export interface TrainingPlanService {
  list(taskId: string): Promise<ServiceResponse<TrainingPlan[]>>;
  requestReplan(
    taskId: string,
    reason: string,
    idempotencyKey: string,
  ): Promise<
    ServiceResponse<{
      accepted: boolean;
      runId: string;
      status: "agent_analyzing";
    }>
  >;
}

export interface ReportService {
  getSummary(taskId: string): Promise<ServiceResponse<ReportSummary>>;
  requestExport(
    taskId: string,
    format: "pdf" | "xlsx",
  ): Promise<
    ServiceResponse<{
      accepted: boolean;
      operationId: string;
      message: string;
    }>
  >;
}

export type AgentRunEventType =
  | "AgentStageChanged"
  | "SkillStarted"
  | "SkillSucceeded"
  | "SkillFailed"
  | "RuleBlocked"
  | "ApprovalRequired"
  | "PlanReplanned"
  | "RunRetried"
  | "RunRolledBack"
  | "HumanTakeoverRequired"
  | "RunCompleted"
  | "RunFailed";

export interface AgentRunEvent {
  id: string;
  runId: string;
  type: AgentRunEventType;
  occurredAt: string;
  summary: string;
  checkpointId?: string;
  retryable?: boolean;
}

export interface AgentRunService {
  getRun(taskId: string): Promise<ServiceResponse<AgentRun>>;
  getEvents(runId: string): Promise<ServiceResponse<AgentRunEvent[]>>;
  retry(runId: string): Promise<ServiceResponse<AgentRun>>;
  rollback(runId: string): Promise<ServiceResponse<AgentRun>>;
  requestHumanTakeover(runId: string): Promise<ServiceResponse<AgentRun>>;
}
