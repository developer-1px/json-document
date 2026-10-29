import type { Annotation } from "./annotation.js";
import type { AnnotationReviewQueue } from "./annotation-review.js";

/** Continuous observations amend pending work; completed work receives a follow-up. */
export function createAnnotationFollowing(queue: AnnotationReviewQueue, createId: () => string) {
  type Target = { annotation: Annotation; source: string };
  let target: Target | null = null;
  let spokenTarget: Target | null = null;
  let pendingText = "";
  let interimText = "";
  let draft: { readonly annotation: Annotation; readonly text: string } | null = null;
  const refreshDraft = () => {
    const at = spokenTarget ?? target;
    const text = interimText || pendingText;
    const next = at && text ? { annotation: at.annotation, text } : null;
    if (draft?.annotation === next?.annotation && draft?.text === next?.text) return;
    draft = next; notify();
  };
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of listeners) listener(); };
  let work: { id: string; page: string; observations: string[]; request: string; context: string } | null = null;
  let context = "";
  let markIds: string[] = [];
  let marks: Annotation["target"][] = [];
  function deliver(text: string, at: Target) {
    const observation = JSON.stringify({ target: at.annotation.target, marks, instruction: text });
    marks = [];
    const task = work && queue.snapshot.value.tasks.find(item => item.id === work!.id);
    const amend = task && ["queued", "planning", "running"].includes(task.state) && work!.page === at.annotation.target.sourceId;
    const annotationIds = [...new Set([...(amend ? task.annotationIds : []), ...markIds, at.annotation.id])];
    markIds = [];
    const observations = amend ? [...work!.observations, observation] : [observation];
    const request = amend ? `${work!.request}\n${text}` : text;
    const previousContext = amend ? work!.context : context;
    const instruction = `사용자가 말하면서 가리킨 순서입니다. 이어지는 말은 앞선 의도를 보정합니다. 가장 최근 의도를 반영하고 모호하면 수정하지 마세요.\n${previousContext ? `직전 대화(이미 처리됐을 수 있으므로 반복 실행하지 말 것): ${previousContext}\n` : ""}${observations.join("\n")}`;
    const annotation = { ...at.annotation, body: { instruction } };
    if (amend && queue.revise(work!.id, annotation, request, annotationIds)) { work!.observations = observations; work!.request = request; }
    else {
      const id = createId();
      queue.enqueue({ id, annotation, source: at.source, request, annotationIds });
      work = { id, page: at.annotation.target.sourceId, observations, request, context: previousContext };
    }
    context = observations.join("\n");
  }
  return {
    get draft() { return draft; },
    get pendingRequest() { return pendingText; },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    point(annotation: Annotation, source: string, explicit = false) {
      target = { annotation, source };
      if (explicit) { marks.push(annotation.target); markIds.push(annotation.id); if (spokenTarget) spokenTarget = target; }
      if (interimText && !spokenTarget) spokenTarget = target;
      refreshDraft();
      if (pendingText) { const text = pendingText; pendingText = ""; notify(); deliver(text, target); refreshDraft(); }
    },
    /** Capture the pointer at speech onset, rather than when recognition finishes. */
    interim(text: string) { interimText = text.trim(); if (interimText && !spokenTarget) spokenTarget = target; refreshDraft(); },
    hear(text: string) {
      if (!text.trim()) return;
      const at = spokenTarget ?? target;
      spokenTarget = null; interimText = "";
      if (at) deliver(text.trim(), at);
      else { pendingText = [pendingText, text.trim()].filter(Boolean).join(" "); notify(); }
      refreshDraft();
    },
    endSpeech() { spokenTarget = null; interimText = ""; refreshDraft(); },
    reset() { target = null; spokenTarget = null; pendingText = ""; work = null; context = ""; marks = []; markIds = []; interimText = ""; draft = null; notify(); },
  };
}
export type AnnotationFollowing = ReturnType<typeof createAnnotationFollowing>;
