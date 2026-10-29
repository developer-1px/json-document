import { createJSONDocument, type JSONValue } from "@interactive-os/json-document";
import type { Annotation } from "./annotation.js";
import { assertAnnotation } from "./annotation-validation.js";

export interface AnnotationReviewTask extends Record<string, JSONValue> {
  readonly id: string;
  readonly annotation: Annotation;
  readonly source: string;
  readonly request: string;
  readonly response: string;
  readonly plan: string;
  readonly annotationIds: readonly string[];
  readonly targetNodeIds: readonly string[];
  readonly state: "queued" | "planning" | "running" | "review" | "accepted" | "reverted" | "error";
  readonly result: string;
  readonly error: string;
}
export interface AnnotationReviewState extends Record<string, JSONValue> {
  readonly tasks: readonly AnnotationReviewTask[];
}
export interface AnnotationReviewCancellation {
  readonly aborted: boolean;
  onAbort(listener: () => void): () => void;
}
export type AnnotationReviewWorker = (task: AnnotationReviewTask, signal: AnnotationReviewCancellation, report: (response: string, targetNodeIds?: readonly string[]) => void) => Promise<string>;
export interface AnnotationReviewQueueOptions {
  /** One coordinator prepares tasks serially before execution. */
  readonly prepare?: AnnotationReviewWorker;
  /** Independent sources may execute in parallel; each source remains ordered. */
  readonly concurrency?: number;
}

/** One optional coordinator, bounded executors, and one publication lane per source. */
export function createAnnotationReviewQueue(initial: unknown = { tasks: [] }) {
  const value = initial as AnnotationReviewState;
  if (!value || !Array.isArray(value.tasks)) throw Error("Invalid review queue");
  const ids = new Set<string>();
  for (const task of value.tasks) {
    assertAnnotation(task.annotation);
    if (!task.id || ids.has(task.id) || typeof task.source !== "string" || typeof task.result !== "string" || typeof task.error !== "string" || !["queued", "planning", "running", "review", "accepted", "reverted", "error"].includes(task.state)) throw Error("Invalid review task");
    ids.add(task.id);
  }
  const document = createJSONDocument({ tasks: value.tasks.map(task => ({ ...task,
    annotationIds: Array.isArray(task.annotationIds) && task.annotationIds.every((id: unknown) => typeof id === "string") ? task.annotationIds : [task.annotation.id],
    targetNodeIds: Array.isArray(task.targetNodeIds) && task.targetNodeIds.every((id: unknown) => typeof id === "string") ? task.targetNodeIds : [],
    request: typeof task.request === "string" ? task.request : reviewRequest(task.annotation),
    response: typeof task.response === "string" ? task.response : "",
    plan: typeof task.plan === "string" ? task.plan : "",
    ...(["planning", "running"].includes(task.state) ? { state: "error", error: "작업이 중단됐습니다. 현재 내용을 확인한 뒤 다시 요청해 주세요." } : {}),
  })) } as AnnotationReviewState);
  let worker: AnnotationReviewWorker | null = null;
  let prepare: AnnotationReviewWorker | null = null;
  let concurrency = 1;
  let draining = false;
  const executions = new Map<string, ReturnType<typeof cancellation>>();
  let planning: { id: string; control: ReturnType<typeof cancellation> } | null = null;
  const tasks = () => (document.value as AnnotationReviewState).tasks;
  const update = (id: string, change: Partial<Pick<AnnotationReviewTask, "state" | "source" | "result" | "error" | "annotation" | "request" | "response" | "plan" | "targetNodeIds" | "annotationIds">>) => {
    const index = tasks().findIndex(task => task.id === id);
    if (index >= 0) document.commit([{ op: "replace", path: `/tasks/${index}`, value: { ...tasks()[index]!, ...change } }]);
  };
  function drain() {
    if (draining || !worker) return;
    draining = true;
    try {
      const toPlan = prepare && !planning && tasks().find(task => task.state === "queued" && !task.plan);
      if (toPlan && prepare) {
        const control = cancellation();
        planning = { id: toPlan.id, control };
        update(toPlan.id, { state: "planning", error: "" });
        void perform(toPlan, control, prepare, true);
      }
      for (const task of tasks()) {
        if (executions.size >= concurrency) break;
        if (task.state !== "queued" || (prepare && !task.plan)) continue;
        const index = tasks().findIndex(item => item.id === task.id);
        const sourceId = task.annotation.target.sourceId;
        if (tasks().slice(0, index).some(item => item.annotation.target.sourceId === sourceId && ["queued", "planning", "running"].includes(item.state))) continue;
        const control = cancellation();
        executions.set(task.id, control);
        update(task.id, { state: "running", error: "" });
        void perform(task, control, worker, false);
      }
    } finally { draining = false; }
  }
  async function perform(task: AnnotationReviewTask, control: ReturnType<typeof cancellation>, run: AnnotationReviewWorker, isPlan: boolean) {
    try {
      const result = await run(task, control.signal, (response, targetNodeIds) => {
        if (!control.signal.aborted && (isPlan ? planning?.control === control : executions.get(task.id) === control)) update(task.id, { response, ...(targetNodeIds ? { targetNodeIds: [...targetNodeIds] } : {}) });
      });
      if (!control.signal.aborted) {
        if (isPlan && !result.trim()) throw Error("수정 계획이 없습니다. 요청을 다시 확인해 주세요.");
        update(task.id, isPlan ? { state: "queued", plan: result } : { state: "review", result });
      }
    } catch (error) {
      if (!control.signal.aborted) update(task.id, { state: "error", error: error instanceof Error ? error.message : "수정을 완료하지 못했습니다." });
    } finally {
      if (isPlan && planning?.control === control) planning = null;
      if (!isPlan && executions.get(task.id) === control) executions.delete(task.id);
      drain();
    }
  }
  function abort(id: string) {
    if (planning?.id === id) planning.control.abort();
    executions.get(id)?.abort(); executions.delete(id);
  }
  return {
    get snapshot() { return { value: document.value as AnnotationReviewState }; },
    subscribe: (listener: () => void) => document.subscribe(listener),
    sourceFor(task: AnnotationReviewTask) {
      let expected = task.source;
      const known = new Set([task.source]);
      for (const previous of tasks()) {
        if (previous.id === task.id) break;
        if (previous.annotation.target.sourceId === task.annotation.target.sourceId && (previous.state === "review" || previous.state === "accepted") && known.has(previous.source)) {
          expected = previous.result; known.add(previous.result);
        }
      }
      return expected;
    },
    enqueue(task: Pick<AnnotationReviewTask, "id" | "annotation" | "source"> & { request?: string; annotationIds?: readonly string[] }) {
      assertAnnotation(task.annotation);
      if (!task.annotation.body.instruction.trim() || tasks().some(item => item.id === task.id)) throw Error("Invalid review request");
      document.commit([{ op: "add", path: "/tasks/-", value: { ...task, annotationIds: task.annotationIds ?? [task.annotation.id], targetNodeIds: [], request: task.request ?? reviewRequest(task.annotation), response: "", plan: "", state: "queued", result: "", error: "" } }]);
      drain();
    },
    revise(id: string, annotation: Annotation, request = reviewRequest(annotation), annotationIds?: readonly string[]) {
      assertAnnotation(annotation);
      const task = tasks().find(item => item.id === id);
      if (!task || !["queued", "planning", "running"].includes(task.state)) return false;
      if (annotation.target.sourceId !== task.annotation.target.sourceId || !annotation.body.instruction.trim()) return false;
      abort(id);
      update(id, { annotation, annotationIds: annotationIds ?? [...task.annotationIds, annotation.id], request, targetNodeIds: [], response: "", plan: "", state: "queued", error: "", result: "" });
      drain(); return true;
    },
    revert(id: string) { if (tasks().find(task => task.id === id)?.state === "review") update(id, { state: "reverted" }); },
    accept(id: string) { if (tasks().find(task => task.id === id)?.state === "review") update(id, { state: "accepted" }); },
    retry(id: string, source: string) {
      if (tasks().find(item => item.id === id)?.state !== "error") return;
      update(id, { state: "queued", source, targetNodeIds: [], response: "", plan: "", error: "", result: "" }); drain();
    },
    connect(run: AnnotationReviewWorker, options: AnnotationReviewQueueOptions = {}) {
      if (worker) throw Error("Review queue already has a worker");
      const limit = options.concurrency ?? 1;
      if (!Number.isInteger(limit) || limit < 1) throw Error("Invalid review concurrency");
      worker = run; prepare = options.prepare ?? null; concurrency = limit; drain();
      return () => {
        worker = null; prepare = null;
        planning?.control.abort();
        for (const control of executions.values()) control.abort();
        executions.clear();
        for (const task of tasks()) if (["planning", "running"].includes(task.state)) update(task.id, { state: "error", error: "작업이 중단됐습니다. 다시 요청해 주세요." });
      };
    },
  };
}
export type AnnotationReviewQueue = ReturnType<typeof createAnnotationReviewQueue>;

function cancellation() {
  let aborted = false;
  const listeners = new Set<() => void>();
  return {
    signal: { get aborted() { return aborted; }, onAbort(listener: () => void) {
      if (aborted) listener(); else listeners.add(listener);
      return () => { listeners.delete(listener); };
    } },
    abort() { if (aborted) return; aborted = true; for (const listener of listeners) listener(); listeners.clear(); },
  };
}
/** Recover readable requests from the previous continuous-review storage format. */
function reviewRequest(annotation: Annotation): string {
  const text = annotation.body.instruction;
  if (!text.startsWith("사용자가 말하면서 가리킨 순서입니다.")) return text;
  const requests = text.split("\n").flatMap(line => {
    try { const value = JSON.parse(line); return typeof value?.instruction === "string" ? [value.instruction] : []; } catch { return []; }
  });
  return requests.join("\n") || "음성 첨삭";
}
