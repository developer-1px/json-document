import { describe, expect, test } from "vitest";
import {
  activateAffordance,
  applyAffordance,
  caretAffordance,
  caretCursor,
  clickCountAffordance,
  commitAffordance,
  createLineFocusSession,
  createRenameSession,
  createTypeaheadSession,
  contextMenuAffordance,
  deleteAffordance,
  dragAffordance,
  dragOperation,
  dropAffordance,
  editingCommandFromWebKeyboardStroke,
  escapeAffordance,
  forbiddenCursor,
  historyAffordance,
  focusAffordance,
  planeHitAffordance,
  pointerSelect,
  pressAffordance,
  renameAffordance,
  hoverAffordance,
  marqueeAffordance,
  marqueeHitsAffordance,
  panAffordance,
  resizeAffordance,
  resolveAffordanceKey,
  selectAllAffordance,
  snapAffordance,
  treeAffordance,
  createBoardDragSession,
  createCanvasGestureSession,
  createGestureSession,
  createViewportInteractionSession,
  typeaheadAffordance,
  wheelAffordance,
  zoomAffordance,
} from "../src/index.js";
import { pressInteractionFromWeb } from "@interactive-os/json-document-web";

describe("Affordance sessions", () => {
  test("preserves an anchor after layout settles", () => {
    const frames: Array<() => void> = [];
    const scrolls: number[] = [];
    let offset = 40;
    const session = createViewportInteractionSession<string>({
      measureAnchor: () => offset,
      scrollBy: (delta) => scrolls.push(delta),
      scrollToFollowTarget: () => scrolls.push(Infinity),
      scheduleFrame: (callback) => { frames.push(callback); return () => undefined; },
      scheduleWatchdog: () => () => undefined,
    });
    session.begin({ anchorKey: "visible-row" });
    offset = 112;
    session.layoutChanged();
    frames.at(-1)?.();
    frames.at(-1)?.();
    expect(scrolls).toEqual([72]);
    expect(session.getSnapshot().active).toBe(false);
  });

  test("follows growth until user intent interrupts it", () => {
    const frames: Array<() => void> = [];
    const events: string[] = [];
    const session = createViewportInteractionSession<string>({
      measureAnchor: () => null,
      scrollBy: () => undefined,
      scrollToFollowTarget: () => events.push("follow"),
      scheduleFrame: (callback) => { frames.push(callback); return () => undefined; },
      scheduleWatchdog: () => () => undefined,
      onCancel: (reason) => events.push(reason),
    });
    session.setFollowing(true);
    session.begin();
    frames.at(-1)?.();
    frames.at(-1)?.();
    expect(events).toEqual(["follow"]);
    session.begin();
    session.interrupt();
    expect(session.getSnapshot().following).toBe(false);
    expect(events).toEqual(["follow", "user-interruption"]);
  });

  test("yields an idle follow mode when user intent arrives between mutations", () => {
    const cancellations: string[] = [];
    const session = createViewportInteractionSession<string>({
      measureAnchor: () => null,
      scrollBy: () => undefined,
      scrollToFollowTarget: () => undefined,
      scheduleFrame: () => () => undefined,
      scheduleWatchdog: () => () => undefined,
      onCancel: (reason) => cancellations.push(reason),
    });
    session.setFollowing(true);
    session.interrupt();
    expect(session.getSnapshot().following).toBe(false);
    expect(cancellations).toEqual(["user-interruption"]);
  });

  test("supersedes stale work and ends an unsettled transaction with a watchdog", () => {
    const frames: Array<() => void> = [];
    const watchdogs: Array<() => void> = [];
    const cancellations: string[] = [];
    const session = createViewportInteractionSession<string>({
      measureAnchor: () => 0,
      scrollBy: () => undefined,
      scrollToFollowTarget: () => undefined,
      scheduleFrame: (callback) => { frames.push(callback); return () => undefined; },
      scheduleWatchdog: (callback) => { watchdogs.push(callback); return () => undefined; },
      onCancel: (reason) => cancellations.push(reason),
    });
    session.begin({ anchorKey: "a" });
    const staleFrame = frames.at(-1)!;
    session.begin({ anchorKey: "b" });
    staleFrame();
    expect(session.getSnapshot().active).toBe(true);
    watchdogs.at(-1)?.();
    expect(cancellations).toEqual(["superseded", "watchdog"]);
    expect(session.getSnapshot().active).toBe(false);
  });

  test("marks session-owned scroll while applying it", () => {
    let owned = false;
    const frames: Array<() => void> = [];
    let session: ReturnType<typeof createViewportInteractionSession<string>>;
    session = createViewportInteractionSession<string>({
      measureAnchor: () => null,
      scrollBy: () => undefined,
      scrollToFollowTarget: () => { owned = session.getSnapshot().applyingScroll; },
      scheduleFrame: (callback) => { frames.push(callback); return () => undefined; },
      scheduleWatchdog: () => () => undefined,
    });
    session.setFollowing(true);
    session.begin();
    frames.at(-1)?.();
    frames.at(-1)?.();
    expect(owned).toBe(true);
  });

  test("owns typeahead buffer and match timing", () => {
    const matches: string[] = [];
    const session = createTypeaheadSession<string>({ onMatch: (key) => matches.push(key) });
    expect(session.handle({
      key: "T", metaKey: false, ctrlKey: false, altKey: false, timeStamp: 10,
      items: [{ key: "today", name: "Today" }], fromKey: null,
    })).toBe(true);
    expect(session.getSnapshot()).toEqual({ buffer: "T", at: 10 });
    expect(matches).toEqual(["today"]);
    session.reset();
    expect(session.getSnapshot()).toEqual({ buffer: "", at: 0 });
  });

  test("owns rename draft, slow double click, commit, and cancel", () => {
    const commits: string[] = [];
    const finished: string[] = [];
    const session = createRenameSession<string>({
      onCommit: (key, draft) => commits.push(`${key}:${draft}`),
      onFinish: (key) => finished.push(key),
    });
    expect(session.handlePointer("a", "Alpha", 1, 10)).toBe(false);
    expect(session.handlePointer("a", "Alpha", 2, 500)).toBe(true);
    session.update("Apex");
    expect(session.handleKey("Enter")).toBe(true);
    expect(commits).toEqual(["a:Apex"]);
    session.begin("b", "Beta");
    expect(session.handleKey("Escape")).toBe(true);
    expect(finished).toEqual(["a", "b"]);
  });

  test("owns ordered logical focus without DOM policy", () => {
    const focused: Array<string | null> = [];
    const session = createLineFocusSession<string>({ initialKey: "a", onFocus: (key) => focused.push(key) });
    expect(session.handle({ key: "ArrowDown", shiftKey: false }, ["a", "b"])).toBe(true);
    expect(session.getFocusKey()).toBe("b");
    expect(session.handle({ key: "Home", shiftKey: false }, ["a", "b"])).toBe(true);
    expect(focused).toEqual(["b", "a"]);
  });

  test("wraps logical focus only when the consumer opts in", () => {
    const focused: Array<string | null> = [];
    const session = createLineFocusSession<string>({ initialKey: "a", wrap: true, onFocus: (key) => focused.push(key) });
    expect(session.handle({ key: "ArrowUp", shiftKey: false }, ["a", "b"])).toBe(true);
    expect(session.getFocusKey()).toBe("b");
    expect(focused).toEqual(["b"]);
  });
});

describe("createBoardDragSession", () => {
  test("shares begin, target preview, commit, cancel, and supersede across input adapters", () => {
    const events: string[] = [];
    const session = createBoardDragSession<string, { readonly columnId: string; readonly beforeCardId: string | null }>({
      onBegin: (item) => events.push(`begin:${item}`),
      onPreview: (item, target) => events.push(`preview:${item}:${target?.columnId ?? "none"}`),
      onCommit: ({ item, target }) => events.push(`commit:${item}:${target.columnId}`),
      onCancel: (item, reason) => events.push(`cancel:${item}:${reason}`),
    });

    session.begin("write");
    expect(session.commit()).toBeNull();
    session.preview({ columnId: "doing", beforeCardId: null });
    expect(session.commit()).toEqual({ item: "write", target: { columnId: "doing", beforeCardId: null } });
    expect(session.getSnapshot()).toEqual({ status: "idle", item: null, target: null });

    session.begin("review");
    session.begin("draw");
    expect(session.cancel("drop-rejected")).toBe("draw");
    expect(events).toEqual([
      "begin:write",
      "preview:write:doing",
      "commit:write:doing",
      "begin:review",
      "cancel:review:superseded",
      "begin:draw",
      "cancel:draw:drop-rejected",
    ]);
  });
});

describe("createCanvasGestureSession", () => {
  test("keeps one typed gesture through preview, commit, cancel, and supersede", () => {
    type Gesture =
      | { readonly type: "drag"; readonly dx: number }
      | { readonly type: "marquee"; readonly width: number };
    const events: string[] = [];
    const session = createCanvasGestureSession<Gesture>({
      onPreview: (gesture) => events.push(`preview:${gesture.type}`),
      onCommit: (gesture) => events.push(`commit:${gesture.type}`),
      onCancel: (gesture, reason) => events.push(`cancel:${gesture.type}:${reason}`),
    });

    session.begin({ type: "drag", dx: 0 });
    expect(session.preview((gesture) => gesture.type === "drag" ? { ...gesture, dx: 12 } : gesture))
      .toEqual({ type: "drag", dx: 12 });
    expect(session.commit()).toEqual({ type: "drag", dx: 12 });
    session.begin({ type: "marquee", width: 0 });
    session.begin({ type: "drag", dx: 0 });
    expect(session.cancel("lost-capture")).toEqual({ type: "drag", dx: 0 });
    expect(events).toEqual([
      "preview:drag",
      "commit:drag",
      "cancel:marquee:superseded",
      "cancel:drag:lost-capture",
    ]);
  });
});

describe("createGestureSession", () => {
  test("accepts annotation semantic states without a Canvas gesture type", () => {
    type AnnotationGesture = { readonly type: "create"; readonly current: { readonly x: number; readonly y: number } };
    const session = createGestureSession<AnnotationGesture>();
    session.begin({ type: "create", current: { x: 1, y: 2 } });
    session.preview((gesture) => ({ ...gesture, current: { x: 4, y: 8 } }));
    expect(session.commit()).toEqual({ type: "create", current: { x: 4, y: 8 } });
    expect(session.getActive()).toBeNull();
  });
});

describe("pointerSelect", () => {
  test("maps conventional modifiers to replace, extend, and toggle", () => {
    const operations: string[] = [];
    applyAffordance(pointerSelect({ shiftKey: false, metaKey: false, ctrlKey: false }), {
      hand: (hand) => {
        if (hand.type === "select") operations.push(hand.operation);
      },
    });
    applyAffordance(pointerSelect({ shiftKey: true, metaKey: false, ctrlKey: false }), {
      hand: (hand) => {
        if (hand.type === "select") operations.push(hand.operation);
      },
    });
    applyAffordance(pointerSelect({ shiftKey: false, metaKey: true, ctrlKey: false }), {
      hand: (hand) => {
        if (hand.type === "select") operations.push(hand.operation);
      },
    });
    applyAffordance(pointerSelect({ shiftKey: false, metaKey: false, ctrlKey: true }), {
      hand: (hand) => {
        if (hand.type === "select") operations.push(hand.operation);
      },
    });
    expect(operations).toEqual(["replace", "extend", "toggle", "toggle"]);
  });
});

describe("editingCommandFromWebKeyboardStroke", () => {
  test("projects supported Web strokes to editing commands", () => {
    expect(editingCommandFromWebKeyboardStroke({
      key: "ArrowDown",
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
    })).toEqual({ type: "move", direction: "down", operation: "replace" });
    expect(editingCommandFromWebKeyboardStroke({
      key: "z",
      shiftKey: false,
      metaKey: true,
      ctrlKey: false,
    })).toEqual({ type: "undo" });
    expect(editingCommandFromWebKeyboardStroke({
      key: "Escape",
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
    })).toBeNull();
  });
});

describe("pressAffordance", () => {
  test("owns start, end, cancel, disabled, and native activation without persistent ARIA state", () => {
    const start = pressAffordance(
      pressInteractionFromWeb({ type: "keydown", key: " " }),
      { status: "idle" },
    );
    expect(start).toEqual({
      hand: { type: "press", phase: "start", source: "keyboard", key: "Space" },
      state: { status: "active", source: "keyboard", key: "Space" },
    });

    const repeated = pressAffordance(
      pressInteractionFromWeb({ type: "keydown", key: " ", repeat: true }),
      start.state,
    );
    expect(repeated).toEqual({ hand: null, state: start.state });

    const end = pressAffordance(
      pressInteractionFromWeb({ type: "keyup", key: " " }),
      repeated.state,
    );
    expect(end).toEqual({
      hand: { type: "press", phase: "end", source: "keyboard", key: "Space" },
      state: { status: "idle" },
    });

    expect(pressAffordance(
      pressInteractionFromWeb({ type: "blur" }),
      start.state,
    )).toEqual({
      hand: { type: "press", phase: "cancel", source: "keyboard", key: "Space" },
      state: { status: "idle" },
    });

    const pointerStart = pressAffordance(
      pressInteractionFromWeb({ type: "pointerdown", button: 0 }),
      { status: "idle" },
    );
    expect(pressAffordance(
      pressInteractionFromWeb({ type: "pointerleave" }),
      pointerStart.state,
    )).toEqual({
      hand: { type: "press", phase: "cancel", source: "pointer" },
      state: { status: "idle" },
    });
    expect(pressAffordance(
      pressInteractionFromWeb({ type: "keydown", key: "Enter" }),
      { status: "idle" },
      { disabled: true },
    )).toEqual({ hand: null, state: { status: "idle" } });
    expect(pressAffordance(
      pressInteractionFromWeb({ type: "click", detail: 0 }),
      { status: "idle" },
    )).toEqual({ hand: { type: "activate" }, state: { status: "idle" } });
  });

  test("maps normalized native and completed custom Press to activation once", () => {
    expect(activateAffordance(pressInteractionFromWeb({ type: "keydown", key: "Enter" })).hand)
      .toEqual({ type: "activate" });
    expect(activateAffordance(pressInteractionFromWeb({ type: "keyup", key: "Enter" })).hand).toBeNull();
    expect(activateAffordance(pressInteractionFromWeb({ type: "keydown", key: " " })).hand).toBeNull();
    expect(activateAffordance(pressInteractionFromWeb({ type: "keyup", key: " " })).hand)
      .toEqual({ type: "activate" });
    expect(activateAffordance({ type: "press", phase: "start", source: "keyboard", key: "Enter" }).hand)
      .toEqual({ type: "activate" });
    expect(activateAffordance({ type: "press", phase: "end", source: "keyboard", key: "Space" }).hand)
      .toEqual({ type: "activate" });
    expect(activateAffordance({ type: "press", phase: "end", source: "pointer" }).hand)
      .toEqual({ type: "activate" });
    expect(activateAffordance(pressInteractionFromWeb({ type: "click", detail: 0 })).hand)
      .toEqual({ type: "activate" });
  });
});

describe("resolveAffordanceKey", () => {
  test("closes the conventional keymap without a host override", () => {
    const hands: unknown[] = [];
    applyAffordance(resolveAffordanceKey({ key: "ArrowDown", shiftKey: false, metaKey: false, ctrlKey: false }), {
      hand: (hand) => hands.push(hand),
    });
    applyAffordance(resolveAffordanceKey({ key: "ArrowDown", shiftKey: true, metaKey: false, ctrlKey: false }), {
      hand: (hand) => hands.push(hand),
    });
    applyAffordance(resolveAffordanceKey({ key: "z", shiftKey: false, metaKey: true, ctrlKey: false }), {
      hand: (hand) => hands.push(hand),
    });
    applyAffordance(resolveAffordanceKey({ key: "z", shiftKey: true, metaKey: true, ctrlKey: false }), {
      hand: (hand) => hands.push(hand),
    });
    applyAffordance(resolveAffordanceKey({ key: "Delete", shiftKey: false, metaKey: false, ctrlKey: false }), {
      hand: (hand) => hands.push(hand),
    });
    expect(hands).toEqual([
      { type: "move", direction: "down", operation: "replace" },
      { type: "move", direction: "down", operation: "extend" },
      { type: "undo" },
      { type: "redo" },
      { type: "delete" },
    ]);
  });
});

describe("treeAffordance", () => {
  test("uses right to expand a collapsed parent and left to collapse an expanded parent", () => {
    expect(treeAffordance({ type: "move", direction: "right" }, { expanded: false, hasChildren: true }).hand).toEqual({
      type: "expand",
    });
    expect(treeAffordance({ type: "move", direction: "left" }, { expanded: true, hasChildren: true }).hand).toEqual({
      type: "collapse",
    });
    expect(treeAffordance({ type: "move", direction: "right" }, { expanded: true, hasChildren: true }).hand).toEqual({
      type: "move",
      direction: "right",
      operation: "replace",
    });
  });
});

describe("dragAffordance", () => {
  test("preview carries translate facts without a commit slot", () => {
    expect(dragAffordance({ x: 10, y: 20 }, { x: 14, y: 18 })).toEqual({
      hand: { type: "translate", dx: 4, dy: -2 },
      cursor: "grabbing",
    });
    expect("commit" in dragAffordance({ x: 10, y: 20 }, { x: 14, y: 18 })).toBe(false);
  });
});

describe("commitAffordance", () => {
  test("commits a moved drag and ignores a stationary one", () => {
    expect(commitAffordance(dragAffordance({ x: 10, y: 20 }, { x: 14, y: 18 }))).toEqual({
      hand: { type: "translate", dx: 4, dy: -2 },
      cursor: "grabbing",
      commit: true,
    });
    expect(commitAffordance(dragAffordance({ x: 10, y: 20 }, { x: 10, y: 20 }))).toBeNull();
  });
});

describe("historyAffordance", () => {
  test("binds disabled to canUndo and canRedo", () => {
    expect(historyAffordance({ canUndo: false, canRedo: true }).hand).toEqual({
      type: "history",
      undo: { name: "undo", disabled: true },
      redo: { name: "redo", disabled: false },
    });
  });
});

describe("applyAffordance", () => {
  test("applies cursor and hand from a preview", () => {
    const cursors: string[] = [];
    const hands: string[] = [];
    applyAffordance(
      { hand: { type: "select", operation: "extend" }, cursor: "cell" },
      {
        cursor: (cursor) => cursors.push(cursor),
        hand: (hand) => hands.push(hand.type),
      },
    );
    expect(cursors).toEqual(["cell"]);
    expect(hands).toEqual(["select"]);
  });

  test("applies commit only on a commit result", () => {
    const committed: string[] = [];
    const previewed: string[] = [];
    applyAffordance(
      { hand: { type: "translate", dx: 4, dy: -2 }, cursor: "grabbing", commit: true },
      {
        hand: (hand) => previewed.push(hand.type),
        commit: (hand) => committed.push(hand.type),
      },
    );
    expect(previewed).toEqual(["translate"]);
    expect(committed).toEqual(["translate"]);
  });
});

describe("typeaheadAffordance", () => {
  test("jumps to the next name with the typed prefix", () => {
    expect(typeaheadAffordance({
      buffer: "",
      key: "A",
      elapsedMs: 0,
      names: ["Inbox", "Today", "Later"],
      from: "Inbox",
    }).hand).toEqual({ type: "typeahead", buffer: "A", name: null });
    expect(typeaheadAffordance({
      buffer: "",
      key: "T",
      elapsedMs: 0,
      names: ["Inbox", "Today", "Later"],
      from: "Inbox",
    }).hand).toEqual({ type: "typeahead", buffer: "T", name: "Today" });
  });

  test.each([
    { metaKey: true },
    { ctrlKey: true },
    { altKey: true },
  ])("leaves modified printable keys for host commands", (modifier) => {
    expect(typeaheadAffordance({
      buffer: "",
      key: "T",
      elapsedMs: 0,
      names: ["Inbox", "Today", "Later"],
      from: "Inbox",
      ...modifier,
    }).hand).toBeNull();
  });
});

describe("focusAffordance", () => {
  test("keeps component traversal separate from internal movement", () => {
    expect(focusAffordance({ key: "Tab", shiftKey: false }).hand).toEqual({ type: "tab", direction: "next" });
    expect(focusAffordance({ key: "Tab", shiftKey: true }).hand).toEqual({ type: "tab", direction: "prev" });
    expect(focusAffordance({ key: "ArrowDown", shiftKey: true }).hand).toEqual({
      type: "move",
      direction: "down",
      operation: "replace",
    });
    expect(focusAffordance({ key: "Home", shiftKey: false }).hand).toEqual({
      type: "boundary",
      edge: "start",
      operation: "replace",
    });
  });
});

describe("caretAffordance", () => {
  test("leaves text geometry to the host while closing pointer and key intent", () => {
    expect(caretAffordance({ type: "pointer" })).toEqual({
      hand: { type: "caret", action: "place", operation: "replace" },
      cursor: "text",
    });
    expect(caretAffordance({ type: "pointer", dragging: true }).hand).toEqual({
      type: "caret",
      action: "range",
      operation: "extend",
    });
    expect(caretAffordance({ key: "ArrowRight", shiftKey: true }).hand).toEqual({
      type: "caret-move",
      direction: "right",
      operation: "extend",
    });
    expect(caretCursor("horizontal")).toBe("text");
    expect(caretCursor("vertical")).toBe("vertical-text");
  });
});

describe("renameAffordance", () => {
  test("begins, commits, and cancels without owning the draft", () => {
    expect(renameAffordance({ key: "F2" }).hand).toEqual({ type: "rename", action: "begin" });
    expect(renameAffordance({ key: "Enter" }).hand).toEqual({ type: "rename", action: "commit" });
    expect(renameAffordance({ key: "Escape" }).hand).toEqual({ type: "rename", action: "cancel" });
    expect(renameAffordance({ type: "pointer", detail: 2, intervalMs: 500 }).hand).toEqual({
      type: "rename",
      action: "begin",
    });
    expect(renameAffordance({ type: "pointer", detail: 2, intervalMs: 200 }).hand).toBeNull();
  });
});

describe("clickCountAffordance", () => {
  test("reports native double and triple click counts", () => {
    expect(clickCountAffordance(2).hand).toEqual({ type: "click", count: 2 });
    expect(clickCountAffordance(3).hand).toEqual({ type: "click", count: 3 });
    expect(clickCountAffordance(0).hand).toBeNull();
  });
});

describe("marqueeAffordance", () => {
  test("Shift extends; Mod without host nesting is replace, not toggle", () => {
    const origin = { x: 0, y: 0 };
    const point = { x: 10, y: 8 };
    expect(marqueeAffordance(origin, point).hand).toMatchObject({ type: "select", operation: "replace" });
    expect(marqueeAffordance(origin, point, { shiftKey: true }).hand).toMatchObject({
      type: "select",
      operation: "extend",
    });
    expect(marqueeAffordance(origin, point, { nested: true }).hand).toMatchObject({
      type: "select",
      operation: "replace",
    });
  });

  test("a stationary empty press is clear, not a zero rect", () => {
    expect(marqueeAffordance({ x: 12, y: 8 }, { x: 12, y: 8 }).hand).toEqual({ type: "clear" });
    expect(commitAffordance(marqueeAffordance({ x: 12, y: 8 }, { x: 12, y: 8 }))).toEqual({
      hand: { type: "clear" },
      commit: true,
    });
  });
});

describe("snapAffordance", () => {
  test("snaps to the grid unless disabled", () => {
    expect(snapAffordance({ x: 47, y: 51 }, { grid: 8 }).hand).toEqual({ type: "translate", dx: 48, dy: 48 });
    expect(snapAffordance({ x: 47, y: 51 }, { grid: 8, disable: true }).hand).toEqual({ type: "translate", dx: 47, dy: 51 });
  });
});

describe("escapeAffordance", () => {
  test("cancels Escape and pointercancel", () => {
    expect(escapeAffordance({ key: "Escape" }).hand).toEqual({ type: "cancel" });
    expect(escapeAffordance({ type: "pointercancel" }).hand).toEqual({ type: "cancel" });
    expect(escapeAffordance({ key: "Enter" }).hand).toBeNull();
  });

  test("pops a gesture before clearing selection", () => {
    expect(escapeAffordance({ key: "Escape", grabbing: true, selected: true }).hand).toEqual({ type: "cancel" });
    expect(escapeAffordance({ key: "Escape", grabbing: false, selected: true }).hand).toEqual({ type: "clear" });
    expect(escapeAffordance({ key: "Escape", grabbing: false, selected: false }).hand).toBeNull();
    expect(escapeAffordance({ type: "pointercancel", selected: true }).hand).toEqual({ type: "cancel" });
  });
});

describe("planeHitAffordance", () => {
  test("keeps the selected set when pressing an already selected object", () => {
    expect(planeHitAffordance({
      hitId: "card",
      selectedIds: ["note", "card"],
    }).hand).toEqual({
      type: "select",
      operation: "replace",
      objectIds: ["note", "card"],
    });
    expect(planeHitAffordance({
      hitId: "chip",
      selectedIds: ["note", "card"],
    }).hand).toEqual({
      type: "select",
      operation: "replace",
      objectIds: ["chip"],
    });
  });

  test("Shift adds or removes; Mod deep-selects only when nestedId is reported", () => {
    expect(planeHitAffordance({
      hitId: "chip",
      selectedIds: ["note"],
      shiftKey: true,
    }).hand).toEqual({
      type: "select",
      operation: "extend",
      objectIds: ["note", "chip"],
    });
    expect(planeHitAffordance({
      hitId: "note",
      selectedIds: ["note", "card"],
      shiftKey: true,
    }).hand).toEqual({
      type: "select",
      operation: "replace",
      objectIds: ["card"],
    });
    expect(planeHitAffordance({
      hitId: "note",
      selectedIds: ["note", "card"],
      metaKey: true,
    }).hand).toEqual({
      type: "select",
      operation: "replace",
      objectIds: ["note", "card"],
    });
    expect(planeHitAffordance({
      hitId: "frame",
      selectedIds: ["frame"],
      metaKey: true,
      nestedId: "child",
    }).hand).toEqual({
      type: "select",
      operation: "replace",
      objectIds: ["child"],
    });
  });

  test("a locked object is not-allowed and is not picked", () => {
    expect(planeHitAffordance({
      hitId: "lock",
      selectedIds: ["note"],
      locked: true,
    })).toEqual({ hand: null, cursor: "not-allowed" });
  });
});

describe("dropAffordance", () => {
  test("previews a drop; only commitAffordance mints the write", () => {
    expect(dropAffordance({ canDrop: false })).toEqual({ hand: null, cursor: "no-drop" });
    expect(dropAffordance({ canDrop: true })).toEqual({
      hand: { type: "move-drop", keepSelection: true },
      cursor: "move",
    });
    expect("commit" in dropAffordance({ canDrop: true })).toBe(false);
    expect(commitAffordance(dropAffordance({ canDrop: false }))).toBeNull();
    expect(commitAffordance(dropAffordance({ canDrop: true }))).toEqual({
      hand: { type: "move-drop", keepSelection: true },
      cursor: "move",
      commit: true,
    });
  });
});

describe("selectAllAffordance", () => {
  test("toggles Mod+A between select-all and clear", () => {
    expect(selectAllAffordance({ key: "a", metaKey: true, ctrlKey: false }, { allSelected: false }).hand)
      .toEqual({ type: "select-all" });
    expect(selectAllAffordance({ key: "a", metaKey: true, ctrlKey: false }, { allSelected: true }).hand)
      .toEqual({ type: "clear" });
    expect(selectAllAffordance({ key: "a", metaKey: false, ctrlKey: false }, { allSelected: false }).hand)
      .toBeNull();
  });
});

describe("drag constrain and copy", () => {
  test("Shift constrains to the dominant axis and Alt shows copy", () => {
    expect(dragAffordance({ x: 0, y: 0 }, { x: 12, y: 3 }, { shiftKey: true }).hand)
      .toEqual({ type: "translate", dx: 12, dy: 0 });
    expect(dragAffordance({ x: 0, y: 0 }, { x: 3, y: 12 }, { shiftKey: true }).hand)
      .toEqual({ type: "translate", dx: 0, dy: 12 });
    expect(dragAffordance({ x: 0, y: 0 }, { x: 8, y: 2 }, { altKey: true }).cursor).toBe("copy");
    expect(dragOperation({ shiftKey: false, metaKey: false, ctrlKey: false, altKey: true })).toEqual({
      hand: { type: "copy" },
      cursor: "copy",
    });
  });
});

describe("marqueeHitsAffordance", () => {
  const items = [
    { id: "touch", x: 8, y: 8, width: 20, height: 20 },
    { id: "inside", x: 4, y: 4, width: 8, height: 8 },
  ];

  test("closes intersect as the plane pick", () => {
    const rect = { x: 0, y: 0, width: 12, height: 12 };
    expect(marqueeHitsAffordance({ rect, items }).hand).toEqual({
      type: "select",
      operation: "replace",
      objectIds: ["touch", "inside"],
    });
    expect(marqueeHitsAffordance({ rect, items, contain: "inside" }).hand).toEqual({
      type: "select",
      operation: "replace",
      objectIds: ["inside"],
    });
  });
});

describe("wheelAffordance and zoomAffordance", () => {
  test("plain wheel pans; Mod+wheel zooms with CSS UI cursors", () => {
    expect(wheelAffordance({ deltaX: 4, deltaY: 10 }).hand).toEqual({ type: "translate", dx: -4, dy: -10 });
    expect(wheelAffordance({ deltaY: -20, metaKey: true })).toEqual({
      hand: { type: "zoom", factor: 1.1 },
      cursor: "zoom-in",
    });
    expect(wheelAffordance({ deltaY: 20, ctrlKey: true })).toEqual({
      hand: { type: "zoom", factor: 1 / 1.1 },
      cursor: "zoom-out",
    });
    expect(zoomAffordance({ key: "+" })).toEqual({ hand: { type: "zoom", factor: 1.1 }, cursor: "zoom-in" });
    expect(zoomAffordance({ key: "-" })).toEqual({ hand: { type: "zoom", factor: 1 / 1.1 }, cursor: "zoom-out" });
  });
});

describe("resizeAffordance", () => {
  test("maps edges onto CSS UI 4 resize cursors and offsets", () => {
    expect(resizeAffordance({ x: 0, y: 0 }, { x: 10, y: 6 }, "se")).toEqual({
      hand: { type: "resize", dx: 0, dy: 0, dw: 10, dh: 6, edge: "se" },
      cursor: "se-resize",
    });
    expect(resizeAffordance({ x: 10, y: 10 }, { x: 4, y: 6 }, "nw").cursor).toBe("nw-resize");
    expect(resizeAffordance({ x: 0, y: 0 }, { x: 8, y: 2 }, "se", { shiftKey: true }).hand).toMatchObject({
      dw: 8,
      dh: 8,
    });
    expect(commitAffordance(resizeAffordance({ x: 0, y: 0 }, { x: 0, y: 0 }, "se"))).toBeNull();
  });
});

describe("deleteAffordance", () => {
  test("Delete and Backspace delete the selection", () => {
    expect(deleteAffordance({ key: "Delete" }).hand).toEqual({ type: "delete" });
    expect(deleteAffordance({ key: "Backspace" }).hand).toEqual({ type: "delete" });
    expect(deleteAffordance({ key: "a" }).hand).toBeNull();
  });
});

describe("hoverAffordance", () => {
  test("plane highlight is immediate and does not use the help cursor", () => {
    expect(hoverAffordance({ elapsedMs: 0, inside: true, highlight: true }).hand)
      .toEqual({ type: "hover", phase: "highlight" });
    expect(hoverAffordance({ elapsedMs: 0, inside: false, highlight: true }).hand).toBeNull();
  });
});

describe("forbiddenCursor", () => {
  test("maps allowed and dropping onto not-allowed and no-drop", () => {
    expect(forbiddenCursor({ allowed: false }).cursor).toBe("not-allowed");
    expect(forbiddenCursor({ allowed: false, dropping: true }).cursor).toBe("no-drop");
    expect(forbiddenCursor({ allowed: true, dropping: true }).cursor).toBe("move");
  });
});

describe("activateAffordance and clickCountAffordance", () => {
  test("Enter and primary click activate; detail 2 is a double-click", () => {
    expect(activateAffordance(pressInteractionFromWeb({ type: "keydown", key: "Enter" })).hand).toEqual({ type: "activate" });
    expect(activateAffordance(pressInteractionFromWeb({ type: "click", button: 0, detail: 1 })).hand).toEqual({ type: "activate" });
    expect(clickCountAffordance(2).hand).toEqual({ type: "click", count: 2 });
    const hands: string[] = [];
    applyAffordance(activateAffordance(pressInteractionFromWeb({ type: "click", button: 0, detail: 2 })), {
      hand: (hand) => hands.push(hand.type),
    });
    expect(hands).toEqual(["activate"]);
  });
});

describe("contextMenuAffordance", () => {
  test("opens without clearing and Escape cancels the menu", () => {
    expect(contextMenuAffordance({ type: "contextmenu" }).hand).toEqual({ type: "menu", action: "open" });
    expect(contextMenuAffordance({ button: 2 }).hand).toEqual({ type: "menu", action: "open" });
    expect(contextMenuAffordance({ key: "Escape" }).hand).toEqual({ type: "menu", action: "cancel" });
  });
});

describe("panAffordance empty arrows", () => {
  test("empty selection arrows pan; selected arrows stay with nudge", () => {
    expect(panAffordance({ key: "ArrowRight", selected: false }).hand)
      .toEqual({ type: "translate", dx: 16, dy: 0 });
    expect(panAffordance({ key: "ArrowRight", selected: true }).hand).toBeNull();
  });
});

describe("snapAffordance disable key", () => {
  test("Mod disable is the closed snap-off hand", () => {
    expect(snapAffordance({ x: 47, y: 51 }, { grid: 8, disable: true }).hand)
      .toEqual({ type: "translate", dx: 47, dy: 51 });
  });
});
