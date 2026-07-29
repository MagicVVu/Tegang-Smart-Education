export type {
  AgentTraceService,
  ApprovalService,
  AssessmentService,
  TrainingService
} from "@tegang/types";

export interface KnowledgeService {
  search(query: string): Promise<{
    citationIds: string[];
    refused: boolean;
    message: string;
  }>;
}
