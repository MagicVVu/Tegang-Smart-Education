import { Tag } from "antd";
import type { TrainingStatus } from "@tegang/types";
import { statusLabels } from "@tegang/shared-utils";

const colors: Record<
  TrainingStatus,
  "default" | "processing" | "success" | "warning" | "error" | "purple"
> = {
  draft: "default",
  information_missing: "warning",
  agent_analyzing: "processing",
  plan_generated: "processing",
  awaiting_admin_confirmation: "warning",
  awaiting_approval: "warning",
  approval_modification: "purple",
  approval_rejected: "error",
  awaiting_publish: "processing",
  executing: "processing",
  learning: "processing",
  awaiting_assessment: "warning",
  assessment_failed: "error",
  remedial_learning: "warning",
  reassessment: "purple",
  completed: "success",
  execution_failed: "error",
  paused: "warning",
  human_takeover: "purple",
  cancelled: "default"
};

export function StatusTag({ status }: { status: TrainingStatus }) {
  return <Tag color={colors[status]}>{statusLabels[status]}</Tag>;
}
