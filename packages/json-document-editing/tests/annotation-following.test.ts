import { expect, it } from "vitest";
import { createAnnotationFollowing } from "../src/annotation-following.js";
import { createAnnotationReviewQueue } from "../src/annotation-review.js";
const mark = (page: string, x = 10) => ({ id: `${page}-${x}`, target: { sourceId: page, selector: { type: "point" as const, x, y: 20 } }, body: { instruction: "" }, presentation: { type: "marker" as const } });
it("amends running intentions and ignores late results of the cancelled execution", async () => {
  const queue = createAnnotationReviewQueue();
  const runs: { signal: { aborted: boolean }; finish: (text: string) => void }[] = [];
  queue.connect((_task, signal) => new Promise<string>(finish => runs.push({ signal, finish })));
  const following = createAnnotationFollowing(queue, () => "task");
  following.point(mark("page"), "original"); following.hear("제목 짧게");
  following.hear("숫자도 넣어줘");
  expect(runs).toHaveLength(2);
  expect(runs[0]!.signal.aborted).toBe(true);
  expect(queue.snapshot.value.tasks).toHaveLength(1);
  expect(queue.snapshot.value.tasks[0]!.annotation.body.instruction).toContain("숫자도 넣어줘");
  runs[1]!.finish("new result"); await Promise.resolve(); await Promise.resolve();
  runs[0]!.finish("obsolete result"); await Promise.resolve(); await Promise.resolve();
  expect(queue.snapshot.value.tasks[0]!.result).toBe("new result");
});
it("binds speech onset to its target and supports speaking before pointing", () => {
  const queue = createAnnotationReviewQueue(); let id = 0;
  const following = createAnnotationFollowing(queue, () => String(++id));
  following.hear("줄여줘"); expect(queue.snapshot.value.tasks).toHaveLength(0);
  expect(following.pendingRequest).toBe("줄여줘");
  following.point(mark("first"), "one");
  expect(following.pendingRequest).toBe("");
  following.interim("여기"); following.point(mark("second"), "two"); following.hear("여기 숫자 넣어줘");
  expect(queue.snapshot.value.tasks).toHaveLength(1);
  expect(queue.snapshot.value.tasks[0]!.annotation.target.sourceId).toBe("first");
  following.hear("이 페이지 제목 수정");
  expect(queue.snapshot.value.tasks[1]!.annotation.target.sourceId).toBe("second");
});
it("follows a completed edit using the current revision instead of replaying a stale source", async () => {
  const queue = createAnnotationReviewQueue(); let id = 0;
  queue.connect(async () => "updated");
  const following = createAnnotationFollowing(queue, () => String(++id));
  following.point(mark("page"), "original"); following.hear("줄여줘");
  await Promise.resolve(); await Promise.resolve();
  following.point(mark("page"), "updated"); following.hear("조금 더 짧게");
  expect(queue.snapshot.value.tasks[1]!.source).toBe("updated");
});

it("explicit marks can correct the target mid-speech and multiple marks remain contextual evidence", () => {
  const queue = createAnnotationReviewQueue();
  const following = createAnnotationFollowing(queue, () => "task");
  following.point(mark("page", 10), "original"); following.interim("아니");
  following.point(mark("page", 100), "original", true);
  following.point(mark("page", 200), "original", true);
  following.hear("이 둘을 합쳐줘");
  const task = queue.snapshot.value.tasks[0]!;
  expect(task.annotation.target.selector).toMatchObject({ x: 200 });
  expect(task.annotation.body.instruction).toContain('"x":100');
  expect(task.annotation.body.instruction).toContain('"x":200');
});
it("retains every consumed mark ID through an amended request so completed ink can be removed together", () => {
  const queue = createAnnotationReviewQueue();
  const following = createAnnotationFollowing(queue, () => "task");
  following.point(mark("page", 10), "original", true);
  following.point(mark("page", 20), "original", true);
  following.hear("이 둘을 바꿔줘");
  expect(queue.snapshot.value.tasks[0]?.annotationIds).toEqual(["page-10", "page-20"]);
  following.point(mark("page", 30), "original", true);
  following.hear("여기도 같이");
  expect(queue.snapshot.value.tasks[0]?.annotationIds).toEqual(["page-10", "page-20", "page-30"]);
});
it("exposes a located interim draft immediately without executing or following passive pointer motion", () => {
  const queue = createAnnotationReviewQueue();
  const following = createAnnotationFollowing(queue, () => "task");
  const first = mark("page", 10);
  following.point(first, "original"); following.interim("제목을");
  const draft = following.draft;
  expect(draft).toEqual({ annotation: first, text: "제목을" });
  expect(queue.snapshot.value.tasks).toHaveLength(0);
  following.point(mark("page", 20), "original");
  expect(following.draft).toBe(draft);
  following.interim("제목을 짧게");
  expect(following.draft?.text).toBe("제목을 짧게");
  following.point(mark("page", 30), "original", true);
  expect(following.draft?.annotation.id).toBe("page-30");
  following.hear("제목을 짧게 바꿔줘");
  expect(following.draft).toBeNull();
  expect(queue.snapshot.value.tasks[0]?.annotation.id).toBe("page-30");
});
it("attaches unfinished speech as soon as a location exists and clears interrupted speech", () => {
  const following = createAnnotationFollowing(createAnnotationReviewQueue(), () => "task");
  following.interim("여기를"); expect(following.draft).toBeNull();
  following.point(mark("page"), "source"); expect(following.draft?.text).toBe("여기를");
  following.endSpeech(); expect(following.draft).toBeNull();
});
