import { Chip } from "react-native-paper";
import type { TrainingStatus } from "@tegang/types";
import { statusLabels } from "@tegang/shared-utils";
import { colors } from "@tegang/design-tokens";

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
      {statusLabels[status]}
    </Chip>
  );
}
