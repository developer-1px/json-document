import { expect, test } from "vitest";
import { createPlaneSelectProfile, type PlaneSelectContext, type PlaneSelectSelection } from "../src/index.js";

// A diagram consumer: no Object document, Editing, Canvas, DOM or React dependency.
const items = ["node:a", "node:b", "node:c"].map((id, index) => ({ id, x: index * 100, y: 20, width: 40, height: 40 }));
const point = { x: 10, y: 30 };
const selected = (keys: readonly string[], primaryKey = keys.at(-1) ?? null): PlaneSelectSelection => ({ kind: "explicit", keys, primaryKey });
const context = (keys: readonly string[] = ["node:a", "node:b"]): PlaneSelectContext => ({ items, selection: selected(keys) });
const stroke = (key: string, mod = false) => ({ key, shiftKey: false, metaKey: mod, ctrlKey: false });

test("press retains a selected set, release collapses a click, and drag produces one set delta", () => {
  const profile = createPlaneSelectProfile();
  expect(profile.begin(context(), { point, hitKey: "node:a" }).selection).toEqual(selected(["node:a", "node:b"], "node:a"));
  expect(profile.commit({ x: 12, y: 31 })).toEqual({ selection: selected(["node:a"]), translation: null });
  profile.begin(context(), { point, hitKey: "node:a" });
  expect(profile.preview({ x: 40, y: 50 })?.translation).toEqual({ keys: ["node:a", "node:b"], dx: 30, dy: 20 });
  expect(profile.commit({ x: 50, y: 60 })?.translation).toEqual({ keys: ["node:a", "node:b"], dx: 40, dy: 30 });
  expect(profile.commit(point)).toBeNull();
});

test("an unselected hit replaces the drag source; Shift activation toggles without range semantics", () => {
  const profile = createPlaneSelectProfile();
  profile.begin(context(), { point, hitKey: "node:c" });
  expect(profile.commit({ x: 20, y: 40 })?.translation?.keys).toEqual(["node:c"]);
  expect(profile.select(context(["node:a"]), "node:c", true)).toEqual(selected(["node:a", "node:c"]));
  expect(profile.select(context(), "node:b", true)).toEqual(selected(["node:a"]));
  profile.begin(context(), { point, hitKey: "node:b", shiftKey: true });
  expect(profile.commit({ x: 40, y: 40 })).toEqual({ selection: selected(["node:a"]), translation: null });
});

test.each([false, true])("marquee is transient and uses base selection for every preview (Shift=%s)", (shiftKey) => {
  const profile = createPlaneSelectProfile();
  const base = context(["node:c"]);
  profile.begin(base, { point: { x: -10, y: 10 }, hitKey: null, shiftKey });
  expect(profile.preview({ x: 150, y: 70 })?.selection.keys).toEqual(shiftKey ? ["node:a", "node:b", "node:c"] : ["node:a", "node:b"]);
  const narrowed = profile.preview({ x: 50, y: 70 });
  expect(narrowed?.selection.keys).toEqual(shiftKey ? ["node:a", "node:c"] : ["node:a"]);
  expect(narrowed?.marquee).toEqual({ x: -10, y: 10, width: 60, height: 60 });
  expect(base.selection).toEqual(selected(["node:c"]));
  expect(profile.commit({ x: 50, y: 70 })?.selection).toEqual(narrowed?.selection);
  expect(profile.getPreview()).toBeNull();
});

test("empty click clears even with Shift; reverse marquee intersects bounds and inside is explicit policy", () => {
  const profile = createPlaneSelectProfile();
  profile.begin(context(), { point, hitKey: null, shiftKey: true });
  expect(profile.commit(point)?.selection).toEqual(selected([]));
  const inside = createPlaneSelectProfile({ contain: "inside" });
  for (const consumer of [profile, inside]) consumer.begin(context([]), { point: { x: 120, y: 80 }, hitKey: null });
  expect(profile.commit({ x: -10, y: 10 })?.selection.keys).toEqual(["node:a", "node:b"]);
  expect(inside.commit({ x: -10, y: 10 })?.selection.keys).toEqual(["node:a"]);
});

test.each(["cancel", "pointer-cancel", "lost-capture", "superseded"] as const)("%s discards preview without mutating base or producing a commit", (reason) => {
  const profile = createPlaneSelectProfile();
  const base = context();
  profile.begin(base, { point, hitKey: null }); profile.preview({ x: 200, y: 100 });
  profile.cancel(reason);
  expect(profile.getPreview()).toBeNull(); expect(profile.commit(point)).toBeNull();
  expect(base.selection).toEqual(selected(["node:a", "node:b"]));
});

test("Escape cancels the inner gesture first, then clears idle selection; repeated Mod+A preserves primary", () => {
  const profile = createPlaneSelectProfile();
  const base = context();
  profile.begin(base, { point, hitKey: "node:a" });
  expect(profile.keyDown(stroke("Escape"), base)).toEqual({ type: "cancel" });
  expect(profile.commit(point)).toBeNull();
  expect(profile.keyDown(stroke("Escape"), base)).toEqual({ type: "selection", selection: selected([]) });
  expect(profile.keyDown(stroke("Escape"), context([]))).toBeNull();
  expect(profile.keyDown(stroke("Escape"), context([]), true)).toEqual({ type: "cancel" });
  const all = profile.keyDown(stroke("a", true), base);
  expect(all).toEqual({ type: "selection", selection: selected(items.map((item) => item.id), "node:b") });
  if (all?.type !== "selection") throw new Error("selection expected");
  expect(profile.keyDown({ ...stroke("A"), ctrlKey: true }, { items, selection: all.selection })).toEqual(all);
});

test("Delete targets the set, edit targets primary only, unrelated/modified keys remain unhandled", () => {
  const profile = createPlaneSelectProfile();
  expect(profile.keyDown(stroke("Delete"), context())).toEqual({ type: "delete", keys: ["node:a", "node:b"] });
  for (const key of ["Enter", "F2"]) expect(profile.keyDown(stroke(key), context())).toEqual({ type: "edit", key: "node:b" });
  for (const key of ["Delete", "Enter", "F2"]) expect(profile.keyDown(stroke(key), context([]))).toBeNull();
  for (const key of ["ArrowLeft", "Home", "z"]) expect(profile.keyDown(stroke(key), context())).toBeNull();
  expect(profile.keyDown(stroke("Enter", true), context())).toBeNull();
});

test("keys and primary reconcile through Selection; geometry and input are captured, and instances are independent", () => {
  const profile = createPlaneSelectProfile();
  const mutable = { items: items.map((item) => ({ ...item })), selection: selected(["missing", "node:a"], "missing") };
  const input = { point: { x: -10, y: 0 }, hitKey: null };
  profile.begin(mutable, input);
  mutable.items[0]!.x = 999; input.point.x = 999;
  expect(profile.commit({ x: 60, y: 80 })?.selection).toEqual(selected(["node:a"]));
  const second = createPlaneSelectProfile();
  profile.begin(context(), { point, hitKey: "node:a" });
  expect(second.getPreview()).toBeNull();
  expect(second.select(context(), "missing")).toEqual(selected([]));
});

test("crossing threshold is latched; returning to the origin has no document delta", () => {
  const profile = createPlaneSelectProfile({ dragThreshold: 5 });
  profile.begin(context(), { point, hitKey: "node:a" });
  expect(profile.preview({ x: 13, y: 34 })?.translation).toBeNull();
  profile.preview({ x: 30, y: 40 });
  expect(profile.commit(point)).toEqual({ selection: selected(["node:a", "node:b"], "node:a"), translation: null });
  profile.begin(context(), { point, hitKey: null }); profile.preview({ x: 100, y: 100 });
  expect(profile.commit(point)?.selection).toEqual(selected([]));
  for (const dragThreshold of [-1, NaN, Infinity]) expect(() => createPlaneSelectProfile({ dragThreshold })).toThrow(RangeError);
});
