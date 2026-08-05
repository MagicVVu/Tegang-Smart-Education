import type {
  ContractAgentRunStatus,
  ContractApprovalStatus,
  ContractLearningRecordStatus,
  ContractTrainingTaskStatus,
  ContractUserRole
} from "@tegang/types";

export const roleLabels: Record<ContractUserRole, string> = {
  employee: "员工／参训人员",
  training_admin: "培训管理员",
  reviewer: "审核员／管理者",
  system_admin: "系统管理员"
};

export type FormalStatus =
  | ContractTrainingTaskStatus
  | ContractLearningRecordStatus
  | ContractAgentRunStatus
  | ContractApprovalStatus;

export const statusLabels: Record<FormalStatus, string> = {
  "TB-DRAFT": "草稿",
  "TB-NEED-INPUT": "信息待补充",
  "TB-ANALYZING": "Agent 分析中",
  "TB-PLAN-READY": "方案已生成",
  "TB-WAIT-CONFIRM": "待管理员确认",
  "TB-WAIT-APPROVAL": "待审批",
  "TB-APPROVAL-EDIT": "审批修改中",
  "TB-APPROVAL-REJECTED": "审批拒绝",
  "TB-WAIT-PUBLISH": "待下发",
  "TB-IN-PROGRESS": "执行中",
  "TB-COMPLETED": "已完成",
  "TB-FAILED": "执行失败",
  "TB-PAUSED": "已暂停",
  "TB-MANUAL": "人工接管",
  "TB-CANCELLED": "已取消",
  "LR-PENDING": "待学习",
  "LR-LEARNING": "学习中",
  "LR-WAIT-ASSESSMENT": "待测评",
  "LR-NOT-MET": "测评未达标",
  "LR-REMEDIAL": "补训中",
  "LR-WAIT-RETEST": "待复测",
  "LR-RETESTING": "复测中",
  "LR-COMPLETED": "学习已完成",
  "LR-PAUSED": "学习已暂停",
  "AR-PENDING": "待运行",
  "AR-RUNNING": "运行中",
  "AR-WAIT-INPUT": "等待输入",
  "AR-WAIT-APPROVAL": "等待审批",
  "AR-WAIT-EXTERNAL": "等待外部结果",
  "AR-RETRYING": "重试中",
  "AR-ROLLING-BACK": "回退中",
  "AR-REPLANNING": "重规划中",
  "AR-PAUSED": "运行已暂停",
  "AR-MANUAL": "人工接管",
  "AR-SUCCEEDED": "运行成功",
  "AR-FAILED": "运行失败",
  "AR-CANCELLED": "运行已取消",
  "AP-NOT-SUBMITTED": "未提交审批",
  "AP-WAITING": "待审批",
  "AP-EDITING": "审批修改中",
  "AP-APPROVED": "审批通过",
  "AP-REJECTED": "审批拒绝",
  "AP-WITHDRAWN": "审批已撤回",
  "AP-EXPIRED": "审批已过期",
  "AP-CANCELLED": "审批已取消"
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

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeTime(value: number): string {
  let remaining = value;
  let encoded = "";
  for (let index = 0; index < 10; index += 1) {
    encoded = CROCKFORD[remaining % 32] + encoded;
    remaining = Math.floor(remaining / 32);
  }
  return encoded;
}

function randomPart(): string {
  return Array.from({ length: 16 }, () =>
    CROCKFORD[Math.floor(Math.random() * CROCKFORD.length)],
  ).join("");
}

export function makeRequestId(): string {
  return `req_${encodeTime(Date.now())}${randomPart()}`;
}

export function traceIdForRequest(requestId: string): string {
  return `trc_${requestId.slice(4)}`;
}

export async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
