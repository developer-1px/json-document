export * from "./index.js";
export {
  createTextRuntime,
  createTextRuntime as createCollaborationTextRuntime,
} from "./create.js";
export {
  restoreTextRuntime,
  restoreTextRuntime as restoreCollaborationTextRuntime,
} from "./restore.js";
export type {
  CollaborationHistoryControl,
  CollaborationHistoryResult,
  CollaborationHistorySnapshot,
  CollaborationTextCapture,
  CollaborationTextCaptureResult,
  CollaborationTextCommitResult,
  CollaborationTextControl,
  CollaborationTextObservation,
  CollaborationTextPlan,
  CollaborationTextPlanResult,
  CollaborationTextRestoreResult,
  CollaborationTextRuntime,
  CollaborationTextSelection,
  History,
  HistoryResult,
  HistoryStatus,
  Text,
  TextCapture,
  TextCaptureResult,
  TextCommitResult,
  TextObservation,
  TextPlan,
  TextPlanResult,
  TextRestoreResult,
  TextRuntime,
  TextSelection,
} from "./types.js";
