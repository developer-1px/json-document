import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createDocumentEditor, type DocumentEditor } from "@interactive-os/json-document-editing";
import {
  DocumentTextControl,
  useDocumentEditor,
  useEditingSnapshot,
  useJSONDocumentValue,
  useReactConnector,
} from "../src/index.js";

afterEach(cleanup);

describe("React Connector", () => {
  test("accepts copied document snapshots without repeated renders", () => {
    const inner = createJSONDocument({ title: "Draft" });
    const document = { ...inner, get value() { return structuredClone(inner.value); } };
    let renders = 0;
    function View() {
      renders += 1;
      const value = useJSONDocumentValue(document) as { title: string };
      return <output>{value.title}</output>;
    }
    render(<View />);
    expect(screen.getByText("Draft")).toBeTruthy();
    expect(renders).toBe(1);
    act(() => { inner.commit([{ op: "replace", path: "/title", value: "Ready" }]); });
    expect(screen.getByText("Ready")).toBeTruthy();
    expect(renders).toBe(2);
  });

  test("composes Document textarea caret, click count, input, and cursor restoration", () => {
    const caretRanges: unknown[] = [];
    const inputs: unknown[] = [];
    const clicks: number[] = [];
    render(
      <DocumentTextControl
        aria-label="Document text"
        text="Alpha"
        offset={2}
        onCaretRange={(from, to, mode) => caretRanges.push({ from, to, mode })}
        onTextInput={(input) => inputs.push(input)}
        onClickCount={(count) => clicks.push(count)}
      />,
    );
    const control = screen.getByRole("textbox", { name: "Document text" }) as HTMLTextAreaElement;
    expect(control.selectionStart).toBe(2);
    expect(control.style.cursor).toBe("text");

    control.setSelectionRange(1, 3);
    fireEvent.click(control, { detail: 2 });
    fireEvent.change(control, { target: { value: "Alps", selectionStart: 4 } });

    expect(caretRanges).toContainEqual({ from: 1, to: 3, mode: "replace" });
    expect(clicks).toEqual([2]);
    expect(inputs).toEqual([{ text: "Alps", offset: 4 }]);
  });

  test("keeps native directional ranges when Document publishes their focus offset", () => {
    const editor = createDocumentEditor({ blocks: [{ id: "a", text: "Alpha" }] });
    function View() {
      const snapshot = useEditingSnapshot(editor);
      return <DocumentTextControl
        aria-label="Bound Document text"
        text="Alpha"
        offset={snapshot.selection.ranges[0]?.focus.offset ?? null}
        onCaretRange={(anchor, focus, mode) => {
          editor.dispatch({ type: "selection.set", blockId: "a", offset: anchor });
          if (mode === "extend" || anchor !== focus) {
            editor.dispatch({ type: "selection.set", blockId: "a", offset: focus, mode: "extend" });
          }
        }}
        onTextInput={() => {}}
      />;
    }
    render(<View />);
    const control = screen.getByRole("textbox", { name: "Bound Document text" }) as HTMLTextAreaElement;
    act(() => { control.focus(); });
    for (const [start, end, direction, anchor, focus] of [
      [2, 4, "forward", 2, 4],
      [1, 2, "backward", 2, 1],
      [3, 3, "none", 3, 3],
    ] as const) {
      control.setSelectionRange(start, end, direction);
      fireEvent.select(control);
      expect(editor.snapshot.selection.ranges).toEqual([{
        anchor: { blockId: "a", offset: anchor }, focus: { blockId: "a", offset: focus },
      }]);
      expect([control.selectionStart, control.selectionEnd]).toEqual([start, end]);
      if (direction !== "none") expect(control.selectionDirection).toBe(direction);
    }
    expect(editor.snapshot).toMatchObject({ value: { blocks: [{ id: "a", text: "Alpha" }] }, canUndo: false, canRedo: false });
    act(() => { editor.dispatch({ type: "selection.set", blockId: "a", offset: 0 }); });
    expect([control.selectionStart, control.selectionEnd]).toEqual([0, 0]);
  });

  test("exposes the shared document through the official Connector entry point", () => {
    const document = createJSONDocument({ title: "Draft" });
    function View() {
      const value = useReactConnector(document) as { readonly title: string };
      return <output>{value.title}</output>;
    }
    render(<View />);

    act(() => {
      document.commit([{ op: "replace", path: "/title", value: "Shared" }]);
    });

    expect(screen.getByText("Shared")).toBeTruthy();
  });

  test("subscribes to a JSON Document with the React external-store contract", () => {
    const document = createJSONDocument({ title: "Draft" });

    function View() {
      const value = useJSONDocumentValue(document) as { readonly title: string };
      return <div>{value.title}</div>;
    }

    render(<View />);
    expect(screen.getByText("Draft")).toBeTruthy();

    act(() => {
      document.commit([{ op: "replace", path: "/title", value: "Ready" }]);
    });

    expect(screen.getByText("Ready")).toBeTruthy();
  });

  test("caches editing snapshots until the source publishes another snapshot", () => {
    const editor = createDocumentEditor({ blocks: [{ id: "a", text: "Alpha" }] });
    let renders = 0;

    function View() {
      renders += 1;
      const snapshot = useEditingSnapshot(editor);
      const value = snapshot.value as { readonly blocks: ReadonlyArray<{ readonly text: string }> };
      return <div>{snapshot.revision}:{value.blocks[0]?.text}</div>;
    }

    render(<View />);
    expect(screen.getByText("0:Alpha")).toBeTruthy();
    expect(renders).toBe(1);

    act(() => {
      editor.dispatch({ type: "text.replace", blockId: "a", text: "Edited" });
    });

    expect(screen.getByText("1:Edited")).toBeTruthy();
    expect(renders).toBe(2);
  });

  test("owns one Document editor for a mounted React component", () => {
    const editors: DocumentEditor[] = [];

    function View({ text }: { readonly text: string }) {
      const editor = useDocumentEditor({ blocks: [{ id: "a", text }] });
      const snapshot = useEditingSnapshot(editor);
      editors.push(editor);
      const value = snapshot.value as { readonly blocks: ReadonlyArray<{ readonly text: string }> };
      return <div>{value.blocks[0]?.text}</div>;
    }

    const rendered = render(<View text="Initial" />);
    rendered.rerender(<View text="Replacement" />);

    expect(screen.getByText("Initial")).toBeTruthy();
    expect(editors[0]).toBe(editors[1]);
  });

  test("updates Editing consumers when an earlier document subscriber reads the editor", () => {
    const document = createJSONDocument({ blocks: [{ id: "a", text: "Alpha" }] });
    const editor = createDocumentEditor(document);
    document.subscribe(() => { void editor.snapshot; });
    function View() {
      const snapshot = useEditingSnapshot(editor);
      const value = snapshot.value as { blocks: ReadonlyArray<{ text: string }> };
      return <output>{snapshot.revision}:{value.blocks[0]?.text}</output>;
    }
    render(<View />);
    act(() => { document.commit([{ op: "replace", path: "/blocks/0/text", value: "External" }]); });
    expect(screen.getByText("1:External")).toBeTruthy();
  });
});
