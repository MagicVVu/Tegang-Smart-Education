import { Tag } from "antd";
import { statusLabels, type FormalStatus } from "@tegang/shared-utils";

const colors: Record<FormalStatus, "default" | "processing" | "success" | "warning" | "error" | "purple"> = {
  "TB-DRAFT": "default", "TB-NEED-INPUT": "warning", "TB-ANALYZING": "processing",
  "TB-PLAN-READY": "processing", "TB-WAIT-CONFIRM": "warning", "TB-WAIT-APPROVAL": "warning",
  "TB-APPROVAL-EDIT": "purple", "TB-APPROVAL-REJECTED": "error", "TB-WAIT-PUBLISH": "processing",
  "TB-IN-PROGRESS": "processing", "TB-COMPLETED": "success", "TB-FAILED": "error",
  "TB-PAUSED": "warning", "TB-MANUAL": "purple", "TB-CANCELLED": "default",
  "LR-PENDING": "default", "LR-LEARNING": "processing", "LR-WAIT-ASSESSMENT": "warning",
  "LR-NOT-MET": "error", "LR-REMEDIAL": "warning", "LR-WAIT-RETEST": "warning",
  "LR-RETESTING": "purple", "LR-COMPLETED": "success", "LR-PAUSED": "warning",
  "AR-PENDING": "default", "AR-RUNNING": "processing", "AR-WAIT-INPUT": "warning",
  "AR-WAIT-APPROVAL": "warning", "AR-WAIT-EXTERNAL": "warning", "AR-RETRYING": "processing",
  "AR-ROLLING-BACK": "purple", "AR-REPLANNING": "processing", "AR-PAUSED": "warning",
  "AR-MANUAL": "purple", "AR-SUCCEEDED": "success", "AR-FAILED": "error", "AR-CANCELLED": "default",
  "AP-NOT-SUBMITTED": "default", "AP-WAITING": "warning", "AP-EDITING": "purple",
  "AP-APPROVED": "success", "AP-REJECTED": "error", "AP-WITHDRAWN": "default",
  "AP-EXPIRED": "warning", "AP-CANCELLED": "default"
};

export function StatusTag({ status }: { status: FormalStatus }) {
  return <Tag color={colors[status]}>{statusLabels[status]}</Tag>;
}
