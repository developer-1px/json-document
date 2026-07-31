import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import {
  createCollaborationRuntime,
  type CollaborationRuntimeOptions,
} from "@interactive-os/json-document-collaboration";
import {
  createTextRuntime,
} from "@interactive-os/json-document-collaboration/text";
import {
  createContentEditableAdapter,
  plainTextDOMAdapter,
} from "../src/index.js";

const baseOptions = {
  epochId: "contenteditable-collaboration/v1",
  ruleset: {
    id: "test/contenteditable-collaboration",
    digest: "test/contenteditable-collaboration/v1",
  },
} as const;

function textRuntime(
  actorId: string,
  initial: unknown = { title: "ab" },
  overrides: Partial<CollaborationRuntimeOptions> = {},
) {
  return createTextRuntime(initial, {
    ...baseOptions,
    actorId,
    ...overrides,
  });
}

function atomicRuntime(
  actorId: string,
  initial: unknown = { title: "ab" },
) {
  return createCollaborationRuntime(initial, {
    ...baseOptions,
    actorId,
  });
}

function createRoot(): HTMLElement {
  const root = document.createElement("div");
  root.contentEditable = "true";
  document.body.append(root);
  return root;
}

function setEditableText(
  root: HTMLElement,
  value: string,
  anchor: number,
  focus = anchor,
): void {
  root.replaceChildren(document.createTextNode(value));
  const text = root.firstChild;
  if (!(text instanceof Text)) throw new Error("missing text node");
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.collapse(text, anchor);
  selection?.extend(text, focus);
}

function input(
  type: "beforeinput" | "input",
  inputType: string,
  isComposing = false,
): InputEvent {
  return new InputEvent(type, {
    bubbles: true,
    cancelable: type === "beforeinput",
    inputType,
    isComposing,
  });
}

function ownChanges(
  runtime: ReturnType<typeof textRuntime>,
  actorId: string,
) {
  return runtime.replica.exportBundle().changes.filter(
    (change) => change.changeId.actorId === actorId,
  );
}

afterEach(() => {
  vi.useRealTimers();
  document.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
});

describe("@interactive-os/json-document-contenteditable-collaboration", () => {
  test("ingests remote text immediately while leasing only DOM notification", () => {
    vi.useFakeTimers();
    const local = textRuntime("actor-a");
    const remote = textRuntime("actor-b");
    const root = createRoot();
    const adapter = createContentEditableAdapter({
      runtime: local,
      pointer: "/title",
      root,
    });
    const unbind = adapter.bind();

    setEditableText(root, "ab", 1);
    adapter.handle(new CompositionEvent("compositionstart"));
    setEditableText(root, "aYb", 2);

    expect(remote.document.commit([{
      op: "replace",
      path: "/title",
      value: "aXb",
    }])).toMatchObject({ ok: true });
    expect(local.replica.ingest(remote.replica.exportBundle()))
      .toMatchObject({ ok: true });

    expect(local.document.value).toEqual({ title: "aXb" });
    expect(root.textContent).toBe("aYb");

    expect(adapter.handle(new CompositionEvent("compositionend")))
      .toMatchObject({
        ok: true,
        kind: "committed",
        changeId: { actorId: "actor-a", counter: 1 },
      });
    expect(local.document.value).toEqual({ title: "aYXb" });
    expect(root.textContent).toBe("aYb");
    expect(ownChanges(local, "actor-a")).toHaveLength(1);

    vi.runOnlyPendingTimers();
    expect(root.textContent).toBe("aYXb");
    expect(document.getSelection()?.anchorOffset).toBe(2);

    expect(remote.replica.ingest(local.replica.exportBundle()))
      .toMatchObject({ ok: true });
    expect(remote.document.value).toEqual(local.document.value);
    unbind();
  });

  test("captures before native input and commits through the text profile", () => {
    const local = textRuntime("actor-a");
    const root = createRoot();
    const adapter = createContentEditableAdapter({
      runtime: local,
      pointer: "/title",
      root,
    });
    const unbind = adapter.bind();

    setEditableText(root, "ab", 1);
    root.dispatchEvent(input("beforeinput", "insertText"));
    setEditableText(root, "aXb", 2);
    root.dispatchEvent(input("input", "insertText"));

    expect(local.document.value).toEqual({ title: "aXb" });
    expect(ownChanges(local, "actor-a")).toHaveLength(1);
    expect(root.textContent).toBe("aXb");
    unbind();
  });

  for (const order of [
    "input-before-compositionend",
    "input-after-compositionend",
  ] as const) {
    test(`authors exactly one Change for ${order}`, () => {
      vi.useFakeTimers();
      const local = textRuntime("actor-a");
      const root = createRoot();
      const adapter = createContentEditableAdapter({
        runtime: local,
        pointer: "/title",
        root,
      });
      adapter.bind();

      setEditableText(root, "ab", 1);
      adapter.handle(new CompositionEvent("compositionstart"));
      setEditableText(root, "aXb", 2);

      if (order === "input-before-compositionend") {
        adapter.handle(input("input", "insertCompositionText", true));
        expect(ownChanges(local, "actor-a")).toHaveLength(0);
      }

      expect(adapter.handle(new CompositionEvent("compositionend")))
        .toMatchObject({ ok: true, kind: "committed" });

      if (order === "input-after-compositionend") {
        adapter.handle(input(
          "beforeinput",
          "insertFromComposition",
        ));
        adapter.handle(input("input", "insertFromComposition"));
      } else {
        vi.runOnlyPendingTimers();
      }

      expect(local.document.value).toEqual({ title: "aXb" });
      expect(root.textContent).toBe("aXb");
      expect(ownChanges(local, "actor-a")).toHaveLength(1);
    });
  }

  test("cancel and reset discard uncommitted DOM and ignore late IME events", () => {
    for (const action of ["cancel", "reset"] as const) {
      const local = textRuntime(`actor-${action}`);
      const root = createRoot();
      const adapter = createContentEditableAdapter({
        runtime: local,
        pointer: "/title",
        root,
      });
      const unbind = adapter.bind();

      setEditableText(root, "ab", 1);
      adapter.handle(new CompositionEvent("compositionstart"));
      setEditableText(root, "aXb", 2);
      if (action === "cancel") {
        expect(adapter.cancel()).toMatchObject({
          ok: true,
          kind: "cancelled",
        });
      } else {
        adapter.reset();
      }

      expect(root.textContent).toBe("ab");
      adapter.handle(new CompositionEvent("compositionend"));
      adapter.handle(input("input", "insertFromComposition"));
      expect(local.document.value).toEqual({ title: "ab" });
      expect(ownChanges(local, `actor-${action}`)).toHaveLength(0);
      unbind();
    }
  });

  for (const scenario of [
    {
      name: "atomic reset",
      patch: [{
        op: "replace" as const,
        path: "/title",
        value: "reset",
      }],
      code: "text_generation_mismatch",
      value: { title: "reset" },
      dom: "reset",
    },
    {
      name: "target deletion",
      patch: [{
        op: "remove" as const,
        path: "/title",
      }],
      code: "text_target_deleted",
      value: {},
      dom: "",
    },
  ]) {
    test(`fails closed after a remote ${scenario.name}`, () => {
      vi.useFakeTimers();
      const local = textRuntime("actor-a");
      const remote = atomicRuntime("actor-b");
      const root = createRoot();
      const adapter = createContentEditableAdapter({
        runtime: local,
        pointer: "/title",
        root,
      });
      adapter.bind();

      setEditableText(root, "ab", 1);
      adapter.handle(new CompositionEvent("compositionstart"));
      setEditableText(root, "aXb", 2);

      expect(remote.document.commit(scenario.patch))
        .toMatchObject({ ok: true });
      expect(local.replica.ingest(remote.replica.exportBundle()))
        .toMatchObject({ ok: true });
      expect(local.document.value).toEqual(scenario.value);
      expect(root.textContent).toBe("aXb");

      expect(adapter.handle(new CompositionEvent("compositionend")))
        .toMatchObject({ ok: false, code: scenario.code });
      expect(ownChanges(local, "actor-a")).toHaveLength(0);

      adapter.handle(input("input", "insertFromComposition"));
      expect(root.textContent).toBe(scenario.dom);
      expect(local.document.value).toEqual(scenario.value);
    });
  }

  test("leases one surface without delaying notification to another", () => {
    const initial = { title: "ab", note: "cd" };
    const local = textRuntime("actor-a", initial);
    const remote = textRuntime("actor-b", initial);
    const titleRoot = createRoot();
    const noteRoot = createRoot();
    const title = createContentEditableAdapter({
      runtime: local,
      pointer: "/title",
      root: titleRoot,
    });
    const note = createContentEditableAdapter({
      runtime: local,
      pointer: "/note",
      root: noteRoot,
    });
    title.bind();
    note.bind();

    setEditableText(titleRoot, "ab", 1);
    title.handle(new CompositionEvent("compositionstart"));
    setEditableText(titleRoot, "aXb", 2);

    remote.document.commit([{
      op: "replace",
      path: "/note",
      value: "cYd",
    }]);
    local.replica.ingest(remote.replica.exportBundle());

    expect(local.document.value).toEqual({ title: "ab", note: "cYd" });
    expect(titleRoot.textContent).toBe("aXb");
    expect(noteRoot.textContent).toBe("cYd");

    title.cancel();
    expect(titleRoot.textContent).toBe("ab");
  });

  test("clamps selection direction and surrogate boundaries after notification", () => {
    const local = textRuntime("actor-a", { title: "A😀B" });
    const remote = atomicRuntime("actor-b", { title: "A😀B" });
    const root = createRoot();
    const adapter = createContentEditableAdapter({
      runtime: local,
      pointer: "/title",
      root,
    });
    adapter.bind();

    setEditableText(root, "A😀B", 2);
    remote.document.commit([{
      op: "replace",
      path: "/title",
      value: "A😀",
    }]);
    local.replica.ingest(remote.replica.exportBundle());

    expect(root.textContent).toBe("A😀");
    expect(document.getSelection()?.anchorOffset).toBe(3);
    expect(document.getSelection()?.focusOffset).toBe(3);

    const backwardLocal = textRuntime("actor-c", { title: "abcdef" });
    const backwardRemote = atomicRuntime("actor-d", { title: "abcdef" });
    const backwardRoot = createRoot();
    createContentEditableAdapter({
      runtime: backwardLocal,
      pointer: "/title",
      root: backwardRoot,
    }).bind();
    setEditableText(backwardRoot, "abcdef", 5, 1);
    backwardRemote.document.commit([{
      op: "replace",
      path: "/title",
      value: "abc",
    }]);
    backwardLocal.replica.ingest(
      backwardRemote.replica.exportBundle(),
    );

    expect(document.getSelection()?.anchorOffset).toBe(3);
    expect(document.getSelection()?.focusOffset).toBe(1);
  });

  test("rejects a composed selection inside a surrogate and recovers the DOM", () => {
    vi.useFakeTimers();
    const local = textRuntime("actor-a", { title: "A😀B" });
    const root = createRoot();
    const adapter = createContentEditableAdapter({
      runtime: local,
      pointer: "/title",
      root,
    });
    adapter.bind();

    setEditableText(root, "A😀B", 1);
    adapter.handle(new CompositionEvent("compositionstart"));
    setEditableText(root, "A😀B", 2);

    expect(adapter.handle(new CompositionEvent("compositionend")))
      .toMatchObject({
        ok: false,
        code: "invalid_text_offset",
      });
    expect(ownChanges(local, "actor-a")).toHaveLength(0);

    adapter.handle(input("input", "insertFromComposition"));
    expect(root.textContent).toBe("A😀B");
    expect(document.getSelection()?.anchorOffset).toBe(3);
    expect(document.getSelection()?.focusOffset).toBe(3);
  });

  test("fails closed when the same actor changes causal history mid-lease", () => {
    const local = textRuntime("actor-a");
    const root = createRoot();
    const adapter = createContentEditableAdapter({
      runtime: local,
      pointer: "/title",
      root,
    });
    adapter.bind();

    setEditableText(root, "ab", 1);
    adapter.handle(new CompositionEvent("compositionstart"));
    setEditableText(root, "aXb", 2);
    expect(local.document.commit([{
      op: "add",
      path: "/done",
      value: true,
    }])).toMatchObject({ ok: true });

    expect(adapter.handle(new CompositionEvent("compositionend")))
      .toMatchObject({
        ok: false,
        code: "stale_text_capture",
      });
    adapter.handle(input("input", "insertFromComposition"));

    expect(local.document.value).toEqual({ title: "ab", done: true });
    expect(root.textContent).toBe("ab");
    expect(ownChanges(local, "actor-a")).toHaveLength(1);
  });

  test("scopes bound events to this editing host", () => {
    const local = textRuntime("actor-a", { title: "ab" });
    const root = createRoot();
    createContentEditableAdapter({
      runtime: local,
      pointer: "/title",
      root,
    }).bind();

    const ordinary = document.createElement("span");
    ordinary.textContent = "ab";
    root.replaceChildren(ordinary);
    ordinary.dispatchEvent(input("beforeinput", "insertText"));
    ordinary.textContent = "aXb";
    ordinary.dispatchEvent(input("input", "insertText"));
    expect(local.document.value).toEqual({ title: "aXb" });

    const nested = document.createElement("span");
    nested.contentEditable = "true";
    nested.textContent = "nested";
    root.append(nested);
    nested.dispatchEvent(input("beforeinput", "insertText"));
    nested.textContent = "nested!";
    nested.dispatchEvent(input("input", "insertText"));
    expect(local.document.value).toEqual({ title: "aXb" });
    expect(nested.isConnected).toBe(true);

    const control = document.createElement("input");
    root.append(control);
    control.dispatchEvent(input("beforeinput", "insertText"));
    control.value = "independent";
    control.dispatchEvent(input("input", "insertText"));
    expect(local.document.value).toEqual({ title: "aXb" });
    expect(control.isConnected).toBe(true);
  });

  test("serializes line breaks and block boundaries as plain text", () => {
    const local = textRuntime("actor-a");
    const root = createRoot();
    createContentEditableAdapter({
      runtime: local,
      pointer: "/title",
      root,
    }).bind();

    root.dispatchEvent(input("beforeinput", "insertLineBreak"));
    root.innerHTML = "a<br>b<div>c</div>";
    root.dispatchEvent(input("input", "insertLineBreak"));

    expect(local.document.value).toEqual({ title: "a\nb\nc" });
    expect(root.textContent).toBe("a\nb\nc");
    expect(plainTextDOMAdapter.observe(root).value).toBe("a\nb\nc");
  });

  test("uses the same block serialization for value and selection offsets", () => {
    const root = createRoot();
    root.innerHTML = "<div>a<br></div><div>b</div>";
    const secondText = root.lastElementChild?.firstChild;
    if (!(secondText instanceof Text)) throw new Error("missing block text");
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.collapse(secondText, 1);

    const observed = plainTextDOMAdapter.observe(root);
    expect(observed).toEqual({
      value: "a\nb",
      selection: { anchor: 3, focus: 3 },
    });

    plainTextDOMAdapter.render(root, observed.value);
    expect(root.childNodes).toHaveLength(1);
    expect(root.firstChild).toBeInstanceOf(Text);
    expect(plainTextDOMAdapter.restoreSelection(
      root,
      observed.selection!,
    )).toBe(true);
    expect(plainTextDOMAdapter.observe(root)).toEqual(observed);
  });

  test("rebases the composition tail selection through a remote merge", () => {
    vi.useFakeTimers();
    const local = textRuntime("actor-a");
    const remote = textRuntime("actor-b");
    const root = createRoot();
    const adapter = createContentEditableAdapter({
      runtime: local,
      pointer: "/title",
      root,
    });
    adapter.bind();

    setEditableText(root, "ab", 1);
    adapter.handle(new CompositionEvent("compositionstart"));
    setEditableText(root, "aXb", 2);
    adapter.handle(new CompositionEvent("compositionend"));

    remote.document.commit([{
      op: "replace",
      path: "/title",
      value: "Yab",
    }]);
    local.replica.ingest(remote.replica.exportBundle());
    adapter.handle(input("input", "insertCompositionText"));

    expect(local.document.value).toEqual({ title: "YaXb" });
    expect(root.textContent).toBe("YaXb");
    expect(document.getSelection()?.anchorOffset).toBe(3);
    expect(document.getSelection()?.focusOffset).toBe(3);
    expect(ownChanges(local, "actor-a")).toHaveLength(1);
  });

  test("fails closed when a composition tail generation is reset or deleted", () => {
    for (const scenario of [
      {
        patch: [{
          op: "replace" as const,
          path: "/title",
          value: "reset",
        }],
        expected: { title: "reset" },
        dom: "reset",
      },
      {
        patch: [{ op: "remove" as const, path: "/title" }],
        expected: {},
        dom: "",
      },
    ]) {
      const local = textRuntime("actor-a");
      const remote = atomicRuntime("actor-b");
      const root = createRoot();
      const adapter = createContentEditableAdapter({
        runtime: local,
        pointer: "/title",
        root,
      });
      adapter.bind();

      setEditableText(root, "ab", 1);
      adapter.handle(new CompositionEvent("compositionstart"));
      setEditableText(root, "aXb", 2);
      adapter.handle(new CompositionEvent("compositionend"));
      remote.document.commit(scenario.patch);
      local.replica.ingest(remote.replica.exportBundle());

      expect(adapter.handle(input("input", "insertCompositionText")))
        .toMatchObject({ ok: false });
      expect(local.document.value).toEqual(scenario.expected);
      expect(root.textContent).toBe(scenario.dom);
    }
  });

  test("releases a native lease when beforeinput is cancelled without input", () => {
    vi.useFakeTimers();
    const local = textRuntime("actor-a");
    const remote = textRuntime("actor-b");
    const root = createRoot();
    const results: unknown[] = [];
    createContentEditableAdapter({
      runtime: local,
      pointer: "/title",
      root,
      onResult: (result) => results.push(result),
    }).bind();
    root.addEventListener("beforeinput", (event) => event.preventDefault());

    root.dispatchEvent(input("beforeinput", "insertText"));
    remote.document.commit([{
      op: "replace",
      path: "/title",
      value: "aYb",
    }]);
    local.replica.ingest(remote.replica.exportBundle());
    expect(root.textContent).toBe("ab");

    vi.runOnlyPendingTimers();
    expect(root.textContent).toBe("aYb");
    expect(results).toContainEqual({ ok: true, kind: "cancelled" });
  });
});
