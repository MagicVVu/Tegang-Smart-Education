/**
 * Read-only data exposed by the active service implementation.
 *
 * Pages import this module instead of binding to the workspace mock package.
 * A real API adapter can replace these snapshots without changing page imports.
 */
export {
  agentRun,
  approvalRecord,
  candidatePlans,
  knowledgeCitations,
  reportSummary,
  trainingTask
} from "@tegang/mock-data";
