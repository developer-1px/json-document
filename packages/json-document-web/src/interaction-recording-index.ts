export {
  createWebInteractionRecorder,
  registerWebInteractionSource,
  traceWebInteraction,
  serializeWebInteractionRecording,
  type WebInteractionRecorder,
  type WebInteractionRecording,
  type WebInteractionRecord,
} from "./interaction-recording.js";
export { createWebRecordingArchive, type WebRecordingSaveResult } from "./interaction-recording-archive.js";
export { bindWebRecordingArchive, downloadWebInteractionRecording } from "./interaction-recording-archive.js";
