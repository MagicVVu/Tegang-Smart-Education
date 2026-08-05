import { Chip } from "react-native-paper";
import { statusLabels, type FormalStatus } from "@tegang/shared-utils";
import { colors } from "@tegang/design-tokens";

function colorFor(status: FormalStatus) {
  if (["TB-COMPLETED", "LR-COMPLETED", "AR-SUCCEEDED", "AP-APPROVED"].includes(status)) return colors.success;
  if (["TB-FAILED", "TB-APPROVAL-REJECTED", "LR-NOT-MET", "AR-FAILED", "AP-REJECTED"].includes(status)) return colors.risk;
  if (["TB-NEED-INPUT", "TB-WAIT-APPROVAL", "TB-PAUSED", "LR-WAIT-ASSESSMENT", "LR-REMEDIAL", "LR-PAUSED"].includes(status)) return colors.warning;
  if (["TB-MANUAL", "AR-MANUAL"].includes(status)) return colors.agent;
  return colors.info;
}

export function StatusChip({ status }: { status: FormalStatus }) {
  const color = colorFor(status);
  return <Chip compact textStyle={{ color, fontSize: 12 }} style={{ backgroundColor: `${color}18` }}>{statusLabels[status]}</Chip>;
}
