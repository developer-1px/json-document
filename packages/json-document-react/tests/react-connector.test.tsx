import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createDocumentEditor, type DocumentEditor } from "@interactive-os/json-document-editing";
import {
  useDocumentEditor,
  useEditingSnapshot,
  useJSONDocumentValue,
  useReactConnector,
} from "../src/index.js";

afterEach(cleanup);

describe("React Connector", () => {
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
});
