import type { TrainingStatus, UserRole } from "@tegang/types";

export const roleLabels: Record<UserRole, string> = {
  employee: "员工／参训人员",
  training_admin: "培训管理员",
  reviewer: "审核员／管理者",
  system_admin: "系统管理员"
};

export const statusLabels: Record<TrainingStatus, string> = {
  draft: "草稿",
  information_missing: "信息待补充",
  agent_analyzing: "Agent分析中",
  plan_generated: "方案已生成",
  awaiting_admin_confirmation: "待管理员确认",
  awaiting_approval: "待审批",
  approval_modification: "审批修改中",
  approval_rejected: "审批拒绝",
  awaiting_publish: "待下发",
  executing: "执行中",
  learning: "学习中",
  awaiting_assessment: "待测评",
  assessment_failed: "测评未达标",
  remedial_learning: "补训中",
  reassessment: "复测中",
  completed: "已完成",
  execution_failed: "执行失败",
  paused: "已暂停",
  human_takeover: "人工接管",
  cancelled: "已取消"
};

export function formatDate(input: string): string {
  const date = new Date(input);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${milliseconds} ms`;
  return `${(milliseconds / 1000).toFixed(1)} s`;
}

export function makeRequestId(prefix = "req"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
