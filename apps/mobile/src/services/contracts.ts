import type {
  AssessmentQuestion,
  AssessmentResult,
  KnowledgeCitation,
  RiskLevel,
  ServiceResponse,
  TrainingStatus
} from "@tegang/types";

export type MobileServiceErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "CONTENT_UNAVAILABLE"
  | "VERSION_CONFLICT"
  | "DUPLICATE_SUBMISSION";

export class MobileServiceError extends Error {
  constructor(
    readonly code: MobileServiceErrorCode,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "MobileServiceError";
  }
}

export interface AuthCredentials {
  account: string;
  password: string;
}

export interface EmployeeProfile {
  id: string;
  displayName: string;
  department: string;
  title: string;
  accountLabel: string;
}

export interface TrainingRecord {
  id: string;
  taskName: string;
  status: "completed" | "in_progress";
  completedAt?: string;
  resultSummary: string;
}

export type EmployeeTaskFilter = "active" | "waiting" | "completed";

export interface EmployeeTrainingTask {
  id: string;
  name: string;
  objective: string;
  department: string;
  audienceLabel: string;
  deadline: string;
  status: TrainingStatus;
  progress: number;
  riskLevel: RiskLevel;
  estimatedMinutes: number;
  nextActionLabel: string;
  availabilityReason?: string;
}

export interface CourseUnit {
  id: string;
  title: string;
  durationMinutes: number;
  riskLevel: RiskLevel;
  completed: boolean;
  eyebrow: string;
  heading: string;
  paragraphs: readonly string[];
  keyPoints: readonly string[];
  scenarioQuestion: string;
  scenarioAnswer: string;
  citationIds: readonly string[];
}

export interface CourseDetail {
  taskId: string;
  title: string;
  units: CourseUnit[];
  currentUnitIndex: number;
  contentVersion: string;
  isRemedial: boolean;
}

export interface LearningProgress {
  task: EmployeeTrainingTask;
  currentUnitIndex: number;
  savedAt: string;
}

export type TutorAnswerKind = "supported" | "refused" | "manual";

export interface TutorSession {
  welcome: string;
  suggestions: string[];
}

export interface TutorAnswer {
  id: string;
  answer: string;
  kind: TutorAnswerKind;
  citationIds: string[];
  highRiskNotice?: string;
}

export interface MobileAssessmentResult extends AssessmentResult {
  submittedAt: string;
  previousScore?: number;
  scoreChange?: number;
  wrongAnswerReasons: Array<{
    questionId: string;
    knowledgePoint: string;
    reason: string;
    recommendation: string;
  }>;
}

export interface AssessmentDraft {
  taskId: string;
  attempt: number;
  answers: Record<string, number[]>;
  savedAt: string;
  storage: "local" | "synced";
}

export interface RemedialPlan {
  taskId: string;
  title: string;
  reason: string;
  weakPoints: Array<{
    knowledgePoint: string;
    reason: string;
    riskLevel: RiskLevel;
  }>;
  requirements: string[];
  nextStep: string;
  currentStep: 1 | 2 | 3;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  icon: string;
  unread: boolean;
  taskId?: string;
  destination?: "task" | "assessment" | "remedial";
}

export interface AuthService {
  login(
    credentials: AuthCredentials,
  ): Promise<ServiceResponse<EmployeeProfile>>;
  logout(): Promise<ServiceResponse<{ success: true }>>;
}

export interface EmployeeTrainingService {
  listTasks(
    filter: EmployeeTaskFilter,
  ): Promise<ServiceResponse<EmployeeTrainingTask[]>>;
  getCurrentTask(): Promise<ServiceResponse<EmployeeTrainingTask | null>>;
  getTask(taskId: string): Promise<ServiceResponse<EmployeeTrainingTask>>;
}

export interface LearningService {
  getCourse(
    taskId: string,
    options?: { remedial?: boolean },
  ): Promise<ServiceResponse<CourseDetail>>;
  start(taskId: string): Promise<ServiceResponse<LearningProgress>>;
  completeUnit(
    taskId: string,
    unitId: string,
  ): Promise<ServiceResponse<LearningProgress>>;
  completeCourse(
    taskId: string,
    options?: { remedial?: boolean },
  ): Promise<ServiceResponse<LearningProgress & { attempt: number }>>;
}

export interface TutorService {
  getSession(taskId: string): Promise<ServiceResponse<TutorSession>>;
  ask(
    taskId: string,
    question: string,
  ): Promise<ServiceResponse<TutorAnswer>>;
  submitFeedback(
    answerId: string,
    helpful: boolean,
  ): Promise<ServiceResponse<{ saved: true }>>;
  requestHumanHelp(
    taskId: string,
    question?: string,
  ): Promise<ServiceResponse<{ accepted: true; message: string }>>;
}

export interface AssessmentService {
  getQuestions(
    taskId: string,
  ): Promise<ServiceResponse<AssessmentQuestion[]>>;
  getDraft(
    taskId: string,
    attempt: number,
  ): Promise<ServiceResponse<AssessmentDraft | null>>;
  saveDraft(
    taskId: string,
    attempt: number,
    answers: Record<string, number[]>,
  ): Promise<ServiceResponse<AssessmentDraft>>;
  submit(
    taskId: string,
    answers: Record<string, number[]>,
    attempt: number,
  ): Promise<ServiceResponse<MobileAssessmentResult>>;
  getResult(
    taskId: string,
  ): Promise<ServiceResponse<MobileAssessmentResult | null>>;
  listResults(): Promise<ServiceResponse<MobileAssessmentResult[]>>;
}

export interface RemedialService {
  getPlan(taskId: string): Promise<ServiceResponse<RemedialPlan>>;
  start(
    taskId: string,
  ): Promise<ServiceResponse<{ task: EmployeeTrainingTask }>>;
}

export interface NotificationService {
  list(): Promise<ServiceResponse<NotificationItem[]>>;
  markRead(id: string): Promise<ServiceResponse<{ saved: true }>>;
}

export interface ProfileService {
  getProfile(): Promise<ServiceResponse<EmployeeProfile>>;
  listTrainingRecords(): Promise<ServiceResponse<TrainingRecord[]>>;
}

export interface KnowledgeCitationService {
  listByIds(
    ids?: readonly string[],
  ): Promise<ServiceResponse<KnowledgeCitation[]>>;
}

export interface MobileServices {
  auth: AuthService;
  training: EmployeeTrainingService;
  learning: LearningService;
  tutor: TutorService;
  assessment: AssessmentService;
  remedial: RemedialService;
  notifications: NotificationService;
  profile: ProfileService;
  citations: KnowledgeCitationService;
}
