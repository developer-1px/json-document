import { expect, it } from "vitest";
import { createAnnotationReviewQueue, type AnnotationReviewState } from "../src/annotation-review.js";
const task = (id: string) => ({ id, source: "original", annotation: { id, target: { sourceId: "page", selector: { type: "point" as const, x: 1, y: 1 } }, body: { instruction: "Fix" }, presentation: { type: "marker" as const } } });
it("runs one task at a time, preserves errors and accepts only reviewed results", async () => {
  const queue = createAnnotationReviewQueue();
  let release!: (result: string) => void;
  const started: string[] = [];
  const disconnect = queue.connect(async task => { started.push(task.id); if (task.id === "b") throw Error("stale"); return new Promise<string>(resolve => { release = resolve; }); });
  queue.enqueue(task("a")); queue.enqueue(task("b"));
  expect(started).toEqual(["a"]);
  queue.accept("a");
  expect((queue.snapshot.value as AnnotationReviewState).tasks[0]!.state).toBe("running");
  release("result");
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(started).toEqual(["a", "b"]);
  expect((queue.snapshot.value as AnnotationReviewState).tasks.map(t => t.state)).toEqual(["review", "error"]);
  queue.accept("a");
  expect((queue.snapshot.value as AnnotationReviewState).tasks[0]!.state).toBe("accepted");
  disconnect();
});
it("restoring an in-flight request never silently replays it", () => {
  const queue = createAnnotationReviewQueue({ tasks: [{ ...task("a"), state: "running", result: "", error: "" }] });
  expect((queue.snapshot.value as AnnotationReviewState).tasks[0]!.state).toBe("error");
});

it("persists readable requests and actual responses while ignoring cancelled response deltas", async () => {
  const queue = createAnnotationReviewQueue();
  const reports: ((text: string) => void)[] = [];
  const releases: ((text: string) => void)[] = [];
  queue.connect((_task, _signal, report) => { reports.push(report); return new Promise(resolve => releases.push(resolve)); });
  queue.enqueue({ ...task("a"), request: "제목 줄여줘" });
  reports[0]!("제목을 살펴보고 있습니다.");
  expect(queue.snapshot.value.tasks[0]!.response).toBe("제목을 살펴보고 있습니다.");
  queue.revise("a", task("a").annotation, "숫자도 넣어줘");
  reports[0]!("취소된 응답");
  expect(queue.snapshot.value.tasks[0]!.response).toBe("");
  reports[1]!("숫자를 넣었습니다."); releases[1]!("updated");
  await Promise.resolve(); await Promise.resolve();
  const restored = createAnnotationReviewQueue(JSON.parse(JSON.stringify(queue.snapshot.value)));
  expect(restored.snapshot.value.tasks[0]).toMatchObject({ request: "숫자도 넣어줘", response: "숫자를 넣었습니다.", state: "review" });
  releases[0]!("stale");
});
it("uses one coordinator and parallel executors while preserving source order", async () => {
  const queue = createAnnotationReviewQueue();
  const plans: string[] = []; const runs: string[] = [];
  const prepare = new Map<string, (value: string) => void>();
  const finish = new Map<string, (value: string) => void>();
  queue.connect(item => { runs.push(item.id); return new Promise(resolve => finish.set(item.id, resolve)); }, {
    concurrency: 3,
    prepare: (item, _signal, report) => { plans.push(item.id); report(`${item.id} 계획`); return new Promise(resolve => prepare.set(item.id, resolve)); },
  });
  queue.enqueue(task("a"));
  queue.enqueue({ ...task("b"), annotation: { ...task("b").annotation, target: { ...task("b").annotation.target, sourceId: "other" } } });
  queue.enqueue(task("c"));
  expect(plans).toEqual(["a"]); expect(runs).toEqual([]);
  prepare.get("a")!("plan a"); await Promise.resolve(); await Promise.resolve();
  expect(plans).toEqual(["a", "b"]); expect(runs).toEqual(["a"]);
  prepare.get("b")!("plan b"); await Promise.resolve(); await Promise.resolve();
  expect(runs).toEqual(["a", "b"]); expect(plans).toEqual(["a", "b", "c"]);
  prepare.get("c")!("plan c"); await Promise.resolve(); await Promise.resolve();
  expect(runs).toEqual(["a", "b"]);
  finish.get("a")!("result a"); await Promise.resolve(); await Promise.resolve();
  expect(runs).toEqual(["a", "b", "c"]);
  expect(queue.sourceFor(queue.snapshot.value.tasks[2]!)).toBe("result a");
  finish.get("b")!("result b"); finish.get("c")!("result c");
});
it("does not overlap a cancelled coordinator with its replacement or start an unplanned execution", async () => {
  const queue = createAnnotationReviewQueue(); const plans: ((text: string) => void)[] = []; const runs: string[] = [];
  queue.connect(async item => { runs.push(item.id); return "result"; }, { prepare: () => new Promise(resolve => plans.push(resolve)), concurrency: 2 });
  queue.enqueue(task("a")); queue.revise("a", task("a").annotation, "updated");
  expect(plans).toHaveLength(1); expect(runs).toEqual([]);
  plans[0]!("obsolete"); await Promise.resolve(); await Promise.resolve();
  expect(plans).toHaveLength(2); expect(runs).toEqual([]);
  plans[1]!("updated plan"); await Promise.resolve(); await Promise.resolve();
  expect(runs).toEqual(["a"]); expect(queue.snapshot.value.tasks[0]!.plan).toBe("updated plan");
});

it("preserves coordinator targets and removes them when a spoken correction replaces the plan", async () => {
  const queue = createAnnotationReviewQueue();
  const stop = queue.connect(() => new Promise(() => {}), { prepare: async (_task, _signal, report) => { report("제목을 고칠게요", ["title"]); return "Fix title"; } });
  queue.enqueue(task("target"));
  await Promise.resolve(); await Promise.resolve();
  expect(queue.snapshot.value.tasks[0]?.targetNodeIds).toEqual(["title"]);
  stop();
  const restored = createAnnotationReviewQueue(queue.snapshot.value);
  restored.retry("target", "new");
  expect(restored.snapshot.value.tasks[0]?.targetNodeIds).toEqual([]);
});
it("reverted results do not become the expected source for later work", async () => {
  const queue = createAnnotationReviewQueue();
  const disconnect = queue.connect(async () => "result");
  queue.enqueue(task("a")); await Promise.resolve(); await Promise.resolve();
  queue.revert("a"); disconnect();
  queue.enqueue(task("b"));
  expect(queue.snapshot.value.tasks[0]?.state).toBe("reverted");
  expect(queue.sourceFor(queue.snapshot.value.tasks[1]!)).toBe("original");
  expect(createAnnotationReviewQueue(queue.snapshot.value).snapshot.value.tasks[0]?.state).toBe("reverted");
});
