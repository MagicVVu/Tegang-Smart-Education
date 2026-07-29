import type {
  RiskLevel,
  TrainingStatus,
  UserRole
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

const actionRoles: Record<PermissionAction, UserRole[]> = {
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

export function can(role: UserRole, action: PermissionAction): boolean {
  return actionRoles[action].includes(role);
}

export function homeRouteForRole(role: UserRole): string {
  switch (role) {
    case "employee":
      return "/mobile-handoff";
    case "training_admin":
      return "/admin/dashboard";
    case "reviewer":
      return "/approvals";
    case "system_admin":
      return "/system/knowledge";
  }
}

export function canAccessPath(role: UserRole, path: string): boolean {
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
  riskLevel: RiskLevel,
): TrainingStatus {
  return riskLevel === "high"
    ? "awaiting_approval"
    : "awaiting_publish";
}

export function mayPublish(
  role: UserRole,
  status: TrainingStatus,
  riskLevel: RiskLevel,
  approvalApproved: boolean,
): boolean {
  if (!can(role, "publish_training")) return false;
  if (status !== "awaiting_publish") return false;
  return riskLevel !== "high" || approvalApproved;
}

export function mayRetry(status: TrainingStatus, retryCount: number): boolean {
  return status === "execution_failed" && retryCount < 2;
}

export function assessmentNextStatus(
  passed: boolean,
  highRiskPassed: boolean,
  remedialAttempts: number,
): TrainingStatus {
  if (passed && highRiskPassed) return "completed";
  if (remedialAttempts >= 2) return "human_takeover";
  return "remedial_learning";
}
