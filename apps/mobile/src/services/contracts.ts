import type {
  ContractApiEnvelope,
  ContractAssessmentDraftView,
  ContractAssessmentQuestion,
  ContractAssessmentResultView,
  ContractCourseDetailView,
  ContractKnowledgeCitation,
  ContractLearningProgressView,
  ContractNotificationItemView,
  ContractPrototypeUserProfile,
  ContractRemedialPlanView,
  ContractTrainingRecordView,
  ContractTrainingTaskView,
  ContractTutorAnswerView,
  ContractTutorSessionView
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

export type EmployeeTaskFilter = "active" | "waiting" | "completed";
export type ServiceResponse<T> = ContractApiEnvelope & { data: T };

export interface AuthService {
  login(credentials: AuthCredentials): Promise<ServiceResponse<ContractPrototypeUserProfile>>;
  logout(): Promise<ServiceResponse<{ success: true }>>;
}

export interface EmployeeTrainingService {
  listTasks(filter: EmployeeTaskFilter): Promise<ServiceResponse<ContractTrainingTaskView[]>>;
  getCurrentTask(): Promise<ServiceResponse<ContractTrainingTaskView | null>>;
  getTask(task_id: string): Promise<ServiceResponse<ContractTrainingTaskView>>;
}

export interface LearningService {
  getCourse(task_id: string, options?: { remedial?: boolean }): Promise<ServiceResponse<ContractCourseDetailView>>;
  start(task_id: string): Promise<ServiceResponse<ContractLearningProgressView>>;
  completeUnit(task_id: string, unit_id: string): Promise<ServiceResponse<ContractLearningProgressView>>;
  completeCourse(task_id: string, options?: { remedial?: boolean }): Promise<ServiceResponse<ContractLearningProgressView>>;
}

export interface TutorService {
  getSession(task_id: string): Promise<ServiceResponse<ContractTutorSessionView>>;
  ask(task_id: string, question: string): Promise<ServiceResponse<ContractTutorAnswerView>>;
  submitFeedback(answer_id: string, helpful: boolean): Promise<ServiceResponse<{ saved: true }>>;
  requestHumanHelp(task_id: string, question?: string): Promise<ServiceResponse<{ accepted: true; message: string }>>;
}

export interface AssessmentService {
  getQuestions(task_id: string): Promise<ServiceResponse<ContractAssessmentQuestion[]>>;
  getDraft(task_id: string, attempt: number): Promise<ServiceResponse<ContractAssessmentDraftView | null>>;
  saveDraft(task_id: string, attempt: number, answers: Record<string, number[]>): Promise<ServiceResponse<ContractAssessmentDraftView>>;
  submit(task_id: string, answers: Record<string, number[]>, attempt: number): Promise<ServiceResponse<ContractAssessmentResultView>>;
  getResult(task_id: string): Promise<ServiceResponse<ContractAssessmentResultView | null>>;
  listResults(): Promise<ServiceResponse<ContractAssessmentResultView[]>>;
}

export interface RemedialService {
  getPlan(task_id: string): Promise<ServiceResponse<ContractRemedialPlanView>>;
  start(task_id: string): Promise<ServiceResponse<{ task: ContractTrainingTaskView }>>;
}

export interface NotificationService {
  list(): Promise<ServiceResponse<ContractNotificationItemView[]>>;
  markRead(id: string): Promise<ServiceResponse<{ saved: true }>>;
}

export interface ProfileService {
  getProfile(): Promise<ServiceResponse<ContractPrototypeUserProfile>>;
  listTrainingRecords(): Promise<ServiceResponse<ContractTrainingRecordView[]>>;
}

export interface KnowledgeCitationService {
  listByIds(ids?: readonly string[]): Promise<ServiceResponse<ContractKnowledgeCitation[]>>;
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
