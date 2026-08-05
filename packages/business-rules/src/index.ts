import type {
  ContractAgentRunStatus,
  ContractLearningRecordStatus,
  ContractRiskLevel,
  ContractTrainingTaskStatus,
  ContractUserRole
} from "@tegang/types";

export type PermissionAction =
  | "create_training"
  | "edit_plan"
  | "submit_approval"
  | "approve_high_risk"
  | "publish_training"
  | "learn"
  | "submit_assessment"
  | "view_business_trace"
  | "view_developer_trace"
  | "manage_system_config"
  | "request_human_takeover";

const actionRoles: Record<PermissionAction, ContractUserRole[]> = {
  create_training: ["training_admin"],
  edit_plan: ["training_admin"],
  submit_approval: ["training_admin"],
  approve_high_risk: ["reviewer"],
  publish_training: ["training_admin"],
  learn: ["employee"],
  submit_assessment: ["employee"],
  view_business_trace: ["training_admin", "reviewer"],
  view_developer_trace: ["system_admin"],
  manage_system_config: ["system_admin"],
  request_human_takeover: ["training_admin"]
};

export function can(role: ContractUserRole, action: PermissionAction): boolean {
  return actionRoles[action].includes(role);
}

export function homeRouteForRole(role: ContractUserRole): string {
  switch (role) {
    case "employee": return "/mobile-handoff";
    case "training_admin": return "/admin/dashboard";
    case "reviewer": return "/approvals";
    case "system_admin": return "/system/knowledge";
  }
}

export function canAccessPath(role: ContractUserRole, path: string): boolean {
  if (path === "/login" || path === "/forbidden") return true;
  if (path.startsWith("/admin/reports/")) {
    return role === "training_admin" || role === "reviewer";
  }
  if (path.startsWith("/admin/")) return role === "training_admin";
  if (path.startsWith("/approvals")) {
    return role === "reviewer" || role === "training_admin";
  }
  if (path.startsWith("/agent-runs/")) {
    return ["training_admin", "reviewer", "system_admin"].includes(role);
  }
  if (path.startsWith("/system/")) return role === "system_admin";
  if (path === "/mobile-handoff") return role === "employee";
  return false;
}

export function nextStatusAfterRisk(
  riskLevel: ContractRiskLevel,
): ContractTrainingTaskStatus {
  return riskLevel === "high" ? "TB-WAIT-APPROVAL" : "TB-WAIT-PUBLISH";
}

export function mayPublish(
  role: ContractUserRole,
  status: ContractTrainingTaskStatus,
  riskLevel: ContractRiskLevel,
  approvalApproved: boolean,
): boolean {
  if (!can(role, "publish_training")) return false;
  if (status !== "TB-WAIT-PUBLISH") return false;
  return riskLevel !== "high" || approvalApproved;
}

export function mayRetry(status: ContractAgentRunStatus, retryCount: number): boolean {
  return status === "AR-FAILED" && retryCount < 2;
}

export function assessmentNextStatus(
  passed: boolean,
  highRiskPassed: boolean,
  remedialAttempts: number,
): ContractLearningRecordStatus {
  if (passed && highRiskPassed) return "LR-COMPLETED";
  if (remedialAttempts >= 2) return "LR-PAUSED";
  return "LR-REMEDIAL";
}
