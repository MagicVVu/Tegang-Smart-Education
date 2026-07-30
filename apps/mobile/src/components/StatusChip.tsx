import { Chip } from "react-native-paper";
import type { TrainingStatus } from "@tegang/types";
import { colors } from "@tegang/design-tokens";

const employeeStatusLabels: Record<TrainingStatus, string> = {
  draft: "待开放",
  information_missing: "信息待补充",
  agent_analyzing: "正在准备",
  plan_generated: "正在准备",
  awaiting_admin_confirmation: "待确认",
  awaiting_approval: "暂不可用",
  approval_modification: "正在调整",
  approval_rejected: "暂不可用",
  awaiting_publish: "待开放",
  executing: "待开始",
  learning: "学习中",
  awaiting_assessment: "待测评",
  assessment_failed: "测评未达标",
  remedial_learning: "补训中",
  reassessment: "待复测",
  completed: "已完成",
  execution_failed: "加载失败",
  paused: "已暂停",
  human_takeover: "人工处理中",
  cancelled: "已取消"
};

function colorFor(status: TrainingStatus) {
  if (["completed"].includes(status)) return colors.success;
  if (
    ["execution_failed", "approval_rejected", "assessment_failed"].includes(
      status,
    )
  )
    return colors.risk;
  if (
    [
      "information_missing",
      "awaiting_approval",
      "awaiting_assessment",
      "remedial_learning",
      "paused"
    ].includes(status)
  )
    return colors.warning;
  if (status === "human_takeover") return colors.agent;
  return colors.info;
}

export function StatusChip({ status }: { status: TrainingStatus }) {
  const color = colorFor(status);
  return (
    <Chip
      compact
      textStyle={{ color, fontSize: 12 }}
      style={{ backgroundColor: `${color}18` }}
    >
      {employeeStatusLabels[status]}
    </Chip>
  );
}
