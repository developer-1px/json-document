/** @vitest-environment jsdom */
import { createJSONDocument } from "@interactive-os/json-document";
import { createRichTextEditor } from "@interactive-os/json-document-rich-text";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { RichTextEditorSurface } from "../src/index.js";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const disposers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const dispose of disposers.splice(0)) await dispose();
  document.body.replaceChildren();
});

async function fixture(rejectComposition = false) {
  const json = createJSONDocument(
    {
      profile: "urn:interactive-os:json-document:rich-text:1",
      id: "doc",
      type: "doc",
      content: [
        {
          id: "p",
          type: "paragraph",
          content: [{ id: "t", type: "text", text: "abc", marks: [] }],
        },
      ],
    },
    {
      validate: (candidate) =>
        rejectComposition && JSON.stringify(candidate).includes("한")
          ? { ok: false, code: "schema_violation" }
          : { ok: true },
    },
  );
  const point = {
    kind: "text" as const,
    nodeId: "t",
    offset: 3,
    affinity: "forward" as const,
  };
  const editor = createRichTextEditor({
    document: json,
    selection: {
      kind: "range",
      ranges: [{ anchor: point, focus: point }],
      primaryIndex: 0,
    },
  });
  const container = document.createElement("div");
  document.body.append(container);
  const reactRoot = createRoot(container);
  disposers.push(async () => {
    await act(async () => reactRoot.unmount());
  });
  await act(async () =>
    reactRoot.render(<RichTextEditorSurface editor={editor} />),
  );
  const root = container.querySelector("article")!;
  const text = root.querySelector('[data-rich-text-text-id="t"]')!.firstChild!;
  root.focus();
  document.getSelection()!.setBaseAndExtent(text, 3, text, 3);
  return { json, editor, root, text, reactRoot, container };
}

it("retains browser DOM ownership while model changes during composition", async () => {
  const { json, editor, root, text, reactRoot } = await fixture();
  const actions: string[] = [];
  await act(async () =>
    reactRoot.render(
      <RichTextEditorSurface
        editor={editor}
        onAction={(action) => actions.push(action)}
      />,
    ),
  );
  await act(async () =>
    root.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  text.textContent = "abcㅎ";
  await act(async () => {
    json.commit([
      { op: "replace", path: "/content/0/content/0/text", value: "abcREMOTE" },
    ]);
  });
  expect(root.querySelector('[data-rich-text-text-id="t"]')!.textContent).toBe(
    "abcㅎ",
  );
  text.textContent = "abc한";
  await act(async () =>
    root.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "한" }),
    ),
  );
  expect(actions).toContain("rich-text.composition-stale");
  expect(json.at("/content/0/content/0/text")).toMatchObject({
    ok: true,
    value: "abcREMOTE",
  });
  expect(root.textContent).toBe("abcREMOTE");
});

it("restores rejected native DOM when canonical text never changed", async () => {
  const { json, editor, root, text, reactRoot } = await fixture(true);
  const actions: string[] = [];
  await act(async () =>
    reactRoot.render(
      <RichTextEditorSurface
        editor={editor}
        onAction={(action) => actions.push(action)}
      />,
    ),
  );
  await act(async () =>
    root.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  text.textContent = "abc한";
  await act(async () =>
    root.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "한" }),
    ),
  );
  expect(actions).toContain("schema_violation");
  expect(json.at("/content/0/content/0/text")).toMatchObject({
    ok: true,
    value: "abc",
  });
  expect(root.textContent).toBe("abc");
  const restored = root.querySelector(
    '[data-rich-text-text-id="t"]',
  )!.firstChild!;
  expect(restored).not.toBe(text);
  expect(document.getSelection()!.anchorNode).toBe(restored);
  expect(document.getSelection()!.anchorOffset).toBe(3);
});

it("commits composition without losing an unrelated model update", async () => {
  const { json, root, text } = await fixture();
  await act(async () =>
    root.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  text.textContent = "abc한";
  await act(async () =>
    json.commit([
      {
        op: "add",
        path: "/content/-",
        value: {
          id: "q",
          type: "paragraph",
          content: [{ id: "u", type: "text", text: "remote", marks: [] }],
        },
      },
    ]),
  );
  expect(root.textContent).toBe("abc한");
  await act(async () =>
    root.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "한" }),
    ),
  );
  expect(root.textContent).toBe("abc한remote");
  expect(json.at("/content/0/content/0/text")).toMatchObject({
    ok: true,
    value: "abc한",
  });
  expect(json.at("/content/1/content/0/text")).toMatchObject({
    ok: true,
    value: "remote",
  });
});

it("preserves an active composition across a callback-only parent rerender", async () => {
  const { json, editor, root, text, reactRoot } = await fixture();
  const first = vi.fn();
  const latest = vi.fn();
  await act(async () =>
    reactRoot.render(
      <RichTextEditorSurface
        editor={editor}
        onAction={first}
        createId={() => "before"}
      />,
    ),
  );
  document.getSelection()!.setBaseAndExtent(text, 3, text, 3);
  await act(async () =>
    root.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  text.textContent = "abcㅎ";
  await act(async () =>
    reactRoot.render(
      <RichTextEditorSurface
        editor={editor}
        onAction={latest}
        createId={() => "after"}
      />,
    ),
  );
  text.textContent = "abc한";
  await act(async () => {
    root.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "한" }),
    );
    root.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertFromComposition",
        data: "한",
      }),
    );
  });
  expect(json.at("/content/0/content/0/text")).toMatchObject({
    ok: true,
    value: "abc한",
  });
  expect(latest.mock.calls.map(([action]) => action)).toContain(
    "composition.commit",
  );
  expect(first.mock.calls.map(([action]) => action)).not.toContain(
    "composition.commit",
  );
  const inserted = new InputEvent("beforeinput", {
    bubbles: true,
    cancelable: true,
    inputType: "insertLineBreak",
  });
  await act(async () => root.dispatchEvent(inserted));
  expect(editor.topology.locate("after")?.node.type).toBe("hardBreak");
});

it("binds the new editable root when the public as prop changes", async () => {
  const { json, editor, reactRoot, container, root: oldRoot } = await fixture();
  await act(async () =>
    oldRoot.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  oldRoot.querySelector(
    '[data-rich-text-text-id="t"]',
  )!.firstChild!.textContent = "abc한";
  await act(async () =>
    reactRoot.render(<RichTextEditorSurface editor={editor} as="section" />),
  );
  const root = container.querySelector("section")!;
  expect(root.textContent).toBe("abc");
  const text = root.querySelector('[data-rich-text-text-id="t"]')!.firstChild!;
  document.getSelection()!.setBaseAndExtent(text, 3, text, 3);
  const event = new InputEvent("beforeinput", {
    bubbles: true,
    cancelable: true,
    inputType: "insertText",
    data: "X",
  });
  await act(async () => root.dispatchEvent(event));
  expect({
    prevented: event.defaultPrevented,
    value: json.at("/content/0/content/0/text"),
  }).toMatchObject({ prevented: true, value: { ok: true, value: "abcX" } });
  const stale = new InputEvent("beforeinput", {
    bubbles: true,
    cancelable: true,
    inputType: "insertText",
    data: "OLD",
  });
  oldRoot.dispatchEvent(stale);
  expect(stale.defaultPrevented).toBe(false);
  expect(json.at("/content/0/content/0/text")).toMatchObject({
    ok: true,
    value: "abcX",
  });
});

it("keeps a second surface live while one surface leases its DOM", async () => {
  const { json, editor, reactRoot, container } = await fixture();
  await act(async () =>
    reactRoot.render(
      <>
        <RichTextEditorSurface editor={editor} />
        <RichTextEditorSurface editor={editor} />
      </>,
    ),
  );
  const [first, second] = Array.from(container.querySelectorAll("article"));
  const text = first!.querySelector(
    '[data-rich-text-text-id="t"]',
  )!.firstChild!;
  document.getSelection()!.setBaseAndExtent(text, 3, text, 3);
  await act(async () =>
    first!.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  text.textContent = "abcㅎ";
  await act(async () =>
    json.commit([
      { op: "replace", path: "/content/0/content/0/text", value: "remote" },
    ]),
  );
  expect(first!.textContent).toBe("abcㅎ");
  expect(second!.textContent).toBe("remote");
});

it("catches up multiple structural and text changes when the composing target disappears", async () => {
  const { json, editor, root, text, reactRoot } = await fixture();
  const actions: string[] = [];
  await act(async () =>
    reactRoot.render(
      <RichTextEditorSurface
        editor={editor}
        onAction={(action) => actions.push(action)}
      />,
    ),
  );
  await act(async () =>
    root.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  text.textContent = "abc한";
  await act(async () => {
    json.commit([
      {
        op: "add",
        path: "/content/-",
        value: {
          id: "q",
          type: "paragraph",
          content: [{ id: "u", type: "text", text: "other", marks: [] }],
        },
      },
    ]);
    json.commit([{ op: "remove", path: "/content/0" }]);
    json.commit([
      { op: "replace", path: "/content/0/content/0/text", value: "latest" },
    ]);
  });
  expect(root.textContent).toBe("abc한");
  await act(async () =>
    root.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "한" }),
    ),
  );
  expect(root.textContent).toBe("latest");
  expect(actions).toContain("rich-text.composition-stale");
  expect(json.at("/content/0/content/0/text")).toMatchObject({
    ok: true,
    value: "latest",
  });
});

it("publishes composition and restores a later cancelled lease without another edit", async () => {
  const { json, root, text } = await fixture();
  await act(async () =>
    root.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  text.textContent = "abc한";
  await act(async () =>
    root.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "한" }),
    ),
  );
  expect(root.textContent).toBe("abc한");
  // A second cancelled lease must not create another history entry.
  const currentText = root.querySelector(
    '[data-rich-text-text-id="t"]',
  )!.firstChild!;
  document.getSelection()!.setBaseAndExtent(currentText, 4, currentText, 4);
  await act(async () =>
    root.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  await act(async () =>
    root.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "" }),
    ),
  );
  expect(json.at("/content/0/content/0/text")).toMatchObject({
    ok: true,
    value: "abc한",
  });
  expect(root.textContent).toBe("abc한");
});

it("releases active composition and all subscriptions on editor replacement and StrictMode unmount", async () => {
  const { json, editor, reactRoot, container } = await fixture();
  await act(async () =>
    reactRoot.render(
      <StrictMode>
        <RichTextEditorSurface editor={editor} />
      </StrictMode>,
    ),
  );
  const oldRoot = container.querySelector("article")!;
  const text = oldRoot.querySelector(
    '[data-rich-text-text-id="t"]',
  )!.firstChild!;
  document.getSelection()!.setBaseAndExtent(text, 3, text, 3);
  await act(async () =>
    oldRoot.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  text.textContent = "abc한";
  const replacement = createRichTextEditor({
    document: createJSONDocument(json.value),
  });
  await act(async () =>
    reactRoot.render(
      <StrictMode>
        <RichTextEditorSurface editor={replacement} />
      </StrictMode>,
    ),
  );
  await act(async () =>
    oldRoot.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "한" }),
    ),
  );
  expect(json.at("/content/0/content/0/text")).toMatchObject({
    ok: true,
    value: "abc",
  });
  await act(async () => reactRoot.render(null));
  const event = new InputEvent("beforeinput", {
    bubbles: true,
    cancelable: true,
    inputType: "insertText",
    data: "x",
  });
  oldRoot.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
});
