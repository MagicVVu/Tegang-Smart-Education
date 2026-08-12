import { createMobileAuthHttpService } from "./auth-http-service";
import { mobileServices as mockServices } from "./mock-services";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "";

export const mobileServices = {
  ...mockServices,
  auth: apiBaseUrl ? createMobileAuthHttpService(apiBaseUrl) : mockServices.auth,
};
export { MobileServiceError } from "./contracts";
export type { AuthCredentials, EmployeeTaskFilter, ServiceResponse } from "./contracts";
export type {
  ContractAssessmentDraftView,
  ContractAssessmentResultView,
  ContractCourseDetailView,
  ContractNotificationItemView,
  ContractPrototypeUserProfile,
  ContractRemedialPlanView,
  ContractTrainingRecordView,
  ContractTrainingTaskView,
  ContractTutorAnswerView,
  ContractTutorSessionView
} from "@tegang/types";
