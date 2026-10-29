import { expect, it } from "vitest";
import { createAnnotationReviewSession } from "../src/annotation-review-session.js";
import { createAnnotationReviewQueue } from "../src/annotation-review.js";
const options = { id: "page", source: "original", width: 960, height: 540 };
const annotation = { id: "mark", target: { sourceId: "page", selector: { type: "point" as const, x: 1, y: 1 } }, body: { instruction: "Fix" }, presentation: { type: "marker" as const } };
it("advances the frozen source and clears marks, selection and obsolete undo", () => {
  const session = createAnnotationReviewSession(options);
  session.editor.dispatch({ type: "annotation.create", annotation });
  expect(session.editor.snapshot.canUndo).toBe(true);
  session.advance("updated");
  expect(session.snapshot.value.source).toBe("updated");
  expect(session.snapshot.value.annotations).toEqual([]);
  expect(session.editor.snapshot.selection.primaryId).toBeNull();
  expect(session.editor.snapshot.canUndo).toBe(false);
});
it("restores legacy source and marks, and rejects another page's state", () => {
  const session = createAnnotationReviewSession(options);
  const { source, ...legacy } = session.snapshot.value;
  const restored = createAnnotationReviewSession(options, { ...legacy, html: source, annotations: [annotation] });
  expect(() => createAnnotationReviewSession(options, null)).toThrow();
  expect(restored.snapshot.value.html).toBeUndefined();
  expect(restored.snapshot.value.source).toBe(source);
  expect(restored.snapshot.value.annotations).toEqual([annotation]);
  expect(() => createAnnotationReviewSession({ ...options, id: "other" }, restored.snapshot.value)).toThrow();
  expect(() => createAnnotationReviewSession(options, { ...legacy, html: 12 })).toThrow();
});
it("source chains follow successful same-page tasks and exclude errors and unrelated revisions", () => {
  const task = (id: string, source: string, result: string, state = "review") => ({ id, request: "Fix", response: "", plan: "", annotationIds: [], targetNodeIds: [], annotation: JSON.parse(JSON.stringify(annotation)), source, result, state, error: "" });
  const queue = createAnnotationReviewQueue({ tasks: [task("a", "original", "one"), task("b", "unrelated", "wrong"), task("c", "one", "failed", "error"), task("d", "original", "two"), task("e", "two", "three")] });
  expect(queue.sourceFor({ ...task("new", "original", ""), state: "queued" })).toBe("three");
});
