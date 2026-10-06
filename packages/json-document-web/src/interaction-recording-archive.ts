import { serializeWebInteractionRecording, type WebInteractionRecording } from "./interaction-recording.js";

export type WebRecordingSaveResult =
  | { readonly ok: true; readonly id: string; readonly path: string }
  | { readonly ok: false; readonly id: string; readonly local: boolean; readonly error: string };

/** Durable browser fallback plus an injected, same-origin recording endpoint. */
export function createWebRecordingArchive(options: {
  endpoint: string;
  storage: Storage;
  fetch: typeof fetch;
}) {
  const prefix = "json-document.interaction-recording.pending.";
  const stage = (recording: WebInteractionRecording): boolean => {
    try { options.storage.setItem(prefix + recording.id, serializeWebInteractionRecording(recording)); return true; }
    catch { return false; }
  };
  const save = async (recording: WebInteractionRecording): Promise<WebRecordingSaveResult> => {
    const body = serializeWebInteractionRecording(recording);
    const key = prefix + recording.id;
    const local = stage(recording);
    try {
      const response = await options.fetch(options.endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body,
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json() as { id?: string; path?: string };
      if (result.id !== recording.id || typeof result.path !== "string") throw new Error("Invalid archive response");
      try { if (options.storage.getItem(key) === body) options.storage.removeItem(key); } catch { /* Duplicate retry is idempotent. */ }
      return { ok: true, id: recording.id, path: result.path };
    } catch (error) {
      return { ok: false, id: recording.id, local, error: error instanceof Error ? error.message : String(error) };
    }
  };
  const pending = (): WebInteractionRecording[] => {
    const recordings: WebInteractionRecording[] = [];
    try {
      for (let index = 0; index < options.storage.length; index++) {
        const key = options.storage.key(index);
        if (!key?.startsWith(prefix)) continue;
        try {
          const recording = JSON.parse(options.storage.getItem(key)!) as WebInteractionRecording;
          if (recording.version === 1 && Array.isArray(recording.records)) recordings.push(recording);
        } catch { /* One malformed entry must not hide other recoverable recordings. */ }
      }
    } catch { /* Storage can be unavailable; callers still retain in-memory recordings. */ }
    return recordings;
  };
  return { save, pending, stage };
}

/** Checkpoint active recordings and flush the final snapshot without write races. */
export function bindWebRecordingArchive(
  recorder: import("./interaction-recording.js").WebInteractionRecorder,
  archive: ReturnType<typeof createWebRecordingArchive>,
  onResult: (result: WebRecordingSaveResult, recording: WebInteractionRecording) => void,
  checkpointMilliseconds = 2000,
): () => void {
  let interval: ReturnType<typeof setInterval> | undefined;
  let saving = false;
  const queue = new Map<string, WebInteractionRecording>();
  const enqueue = (recording: WebInteractionRecording) => {
    archive.stage(recording);
    queue.set(recording.id, recording);
    if (!saving) void drain();
  };
  async function drain() {
    saving = true;
    while (queue.size) {
      const [id, recording] = queue.entries().next().value!;
      queue.delete(id);
      const result = await archive.save(recording);
      onResult(result, recording);
    }
    saving = false;
  }
  const change = () => {
    clearInterval(interval);
    const snapshot = recorder.snapshot();
    if (snapshot) enqueue(snapshot);
    if (recorder.recording) interval = setInterval(() => {
      const current = recorder.snapshot();
      if (current) enqueue(current);
    }, checkpointMilliseconds);
  };
  for (const recording of archive.pending()) enqueue(recording);
  const unsubscribe = recorder.subscribe(change);
  if (recorder.recording) change();
  return () => { clearInterval(interval); unsubscribe(); };
}

export function downloadWebInteractionRecording(doc: Document, recording: WebInteractionRecording): void {
  const url = URL.createObjectURL(new Blob([serializeWebInteractionRecording(recording)], { type: "application/json" }));
  const link = doc.createElement("a");
  link.href = url;
  link.download = `interaction-${recording.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
