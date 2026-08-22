import { useRef, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { createDocumentEditor, createSheetEditor } from "@interactive-os/json-document-editing";
import {
  useEditing,
  useRestoreElementFocus,
  type EditingKeyboardCommand,
  type EditingKeyboardStroke,
} from "../src/index.js";

afterEach(cleanup);

function resolveStroke(stroke: EditingKeyboardStroke): EditingKeyboardCommand | null {
  if (stroke.key === "ArrowDown") return { type: "move", direction: "down", operation: stroke.shiftKey ? "extend" : "replace" };
  if (stroke.key === "ArrowLeft") return { type: "move", direction: "left", operation: stroke.shiftKey ? "extend" : "replace" };
  if (stroke.key === " ") return { type: "toggle" };
  if (stroke.key === "Delete" || stroke.key === "Backspace") return { type: "delete" };
  if (stroke.key === "z" && (stroke.metaKey || stroke.ctrlKey) && stroke.shiftKey) return { type: "redo" };
  if (stroke.key === "z" && (stroke.metaKey || stroke.ctrlKey)) return { type: "undo" };
  return null;
}

describe("useEditing", () => {
  test("restores roving DOM focus after a focused item is deleted", () => {
    const editor = createDocumentEditor({
      blocks: [{ id: "alpha", text: "Alpha" }, { id: "bravo", text: "Bravo" }],
    });

    function Item(props: { readonly id: string; readonly focused: boolean }) {
      const ref = useRef<HTMLButtonElement>(null);
      useRestoreElementFocus(ref, props.focused);
      return <button ref={ref} type="button">{props.id}</button>;
    }

    function View() {
      const focus = editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.blockId ?? null;
      const editing = useEditing({
        source: editor,
        selectedKeys: editor.selectedBlockIds,
        focusKey: focus,
        onSelect: (key, mode) => editor.dispatch({ type: "selection.set", blockId: key, mode }),
      });
      const blocks = (editing.snapshot.value as { blocks: Array<{ id: string }> }).blocks;
      return <>{blocks.map((block) => <Item key={block.id} id={block.id} focused={editing.getItem(block.id).getIsFocus()} />)}</>;
    }

    render(<View />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "alpha" }));
    act(() => { editor.dispatch({ type: "selection.remove" }); });
    expect(screen.queryByRole("button", { name: "alpha" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "bravo" }));
  });

  test("answers host keys without an editor source", () => {
    function View() {
      const [selected, setSelected] = useState<string[]>([]);
      const editing = useEditing({
        selectedKeys: selected,
        focusKey: selected.at(-1) ?? null,
        onSelect: (key, mode) => {
          setSelected((current) => mode === "replace" ? [key] : [...current, key]);
        },
      });
      return (
        <div>
          {["title", "note"].map((id) => {
            const item = editing.getItem(id);
            return (
              <button
                key={id}
                type="button"
                data-selected={item.getIsSelected() ? "true" : "false"}
                data-focus={item.getIsFocus() ? "true" : "false"}
                onClick={item.getPressHandler()}
              >
                {id}
              </button>
            );
          })}
        </div>
      );
    }

    render(<View />);
    fireEvent.click(screen.getByRole("button", { name: "title" }));
    expect(screen.getByRole("button", { name: "title" }).getAttribute("data-selected")).toBe("true");
    expect(screen.getByRole("button", { name: "title" }).getAttribute("data-focus")).toBe("true");
    expect(screen.getByRole("button", { name: "note" }).getAttribute("data-selected")).toBe("false");
  });

  test("answers selection and press mode without owning markup", () => {
    const editor = createDocumentEditor({
      blocks: [
        { id: "alpha", text: "Alpha" },
        { id: "bravo", text: "Bravo" },
      ],
    });
    const modes: string[] = [];

    function View() {
      const editing = useEditing({
        source: editor,
        selectedKeys: editor.selectedBlockIds,
        onSelect: (key, mode) => {
          modes.push(`${mode}:${key}`);
          editor.dispatch({ type: "selection.set", blockId: key, mode });
        },
      });
      return (
        <div>
          {["alpha", "bravo"].map((id) => {
            const item = editing.getItem(id);
            return (
              <button
                key={id}
                type="button"
                data-selected={item.getIsSelected() ? "true" : "false"}
                onClick={item.getPressHandler()}
              >
                {id}
              </button>
            );
          })}
        </div>
      );
    }

    render(<View />);
    fireEvent.click(screen.getByRole("button", { name: "alpha" }));
    fireEvent.click(screen.getByRole("button", { name: "bravo" }), { shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "alpha" }), { metaKey: true });

    expect(modes).toEqual(["replace:alpha", "extend:bravo", "toggle:alpha"]);
    expect(screen.getByRole("button", { name: "alpha" }).getAttribute("data-selected")).toBe("true");
    expect(screen.getByRole("button", { name: "bravo" }).getAttribute("data-selected")).toBe("true");
  });

  test("separates interval selection from focus and text offset", () => {
    const editor = createDocumentEditor({
      blocks: [
        { id: "alpha", text: "Alpha" },
        { id: "bravo", text: "Bravo" },
      ],
    });
    editor.dispatch({ type: "selection.set", blockId: "alpha", offset: 2 });
    editor.dispatch({ type: "selection.set", blockId: "bravo", mode: "extend", offset: 1 });

    function View() {
      const focus = editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus;
      const editing = useEditing({
        source: editor,
        selectedKeys: editor.selectedBlockIds,
        focusKey: focus?.blockId ?? null,
        textOffset: focus?.offset ?? null,
        onSelect: (key, mode) => {
          editor.dispatch({ type: "selection.set", blockId: key, mode });
        },
      });
      return (
        <div>
          {["alpha", "bravo"].map((id) => {
            const item = editing.getItem(id);
            return (
              <span
                key={id}
                data-selected={item.getIsSelected() ? "true" : "false"}
                data-focus={item.getIsFocus() ? "true" : "false"}
                data-offset={item.getTextOffset() ?? ""}
              >
                {id}
              </span>
            );
          })}
        </div>
      );
    }

    render(<View />);
    expect(screen.getByText("alpha").getAttribute("data-selected")).toBe("true");
    expect(screen.getByText("bravo").getAttribute("data-selected")).toBe("true");
    expect(screen.getByText("alpha").getAttribute("data-focus")).toBe("false");
    expect(screen.getByText("bravo").getAttribute("data-focus")).toBe("true");
    expect(screen.getByText("bravo").getAttribute("data-offset")).toBe("1");
    expect(screen.getByText("alpha").getAttribute("data-offset")).toBe("");
  });

  test("routes keyboard commands through host neighbor and history doors", () => {
    const editor = createDocumentEditor({
      blocks: [
        { id: "alpha", text: "Alpha" },
        { id: "bravo", text: "Bravo" },
        { id: "charlie", text: "Charlie" },
      ],
    });
    editor.dispatch({ type: "selection.set", blockId: "alpha" });
    const ids = ["alpha", "bravo", "charlie"];

    function View() {
      const editing = useEditing({
        source: editor,
        selectedKeys: editor.selectedBlockIds,
        onSelect: (key, mode) => {
          editor.dispatch({ type: "selection.set", blockId: key, mode });
        },
        keyboard: {
          resolve: resolveStroke,
          focusKey: () => editor.selectedBlockIds.at(-1),
          neighbor: (key, command) => {
            if (command.type !== "move") return null;
            const index = ids.indexOf(key);
            return ids[index + 1] ?? null;
          },
          onDelete: () => {
            editor.dispatch({ type: "selection.remove" });
          },
          onUndo: () => {
            editor.undo();
          },
        },
      });
      return (
        <div tabIndex={0} onKeyDown={editing.getKeyDownHandler()} data-testid="surface">
          {ids.map((id) => (
            <span key={id} data-selected={editing.getItem(id).getIsSelected() ? "true" : "false"}>{id}</span>
          ))}
        </div>
      );
    }

    render(<View />);
    const surface = screen.getByTestId("surface");
    fireEvent.keyDown(surface, { key: "ArrowDown" });
    expect(editor.selectedBlockIds).toEqual(["bravo"]);

    fireEvent.keyDown(surface, { key: "Delete" });
    expect((editor.snapshot.value as { blocks: Array<{ id: string }> }).blocks.map((block) => block.id))
      .toEqual(["alpha", "charlie"]);

    fireEvent.keyDown(surface, { key: "z", metaKey: true });
    expect((editor.snapshot.value as { blocks: Array<{ id: string }> }).blocks.map((block) => block.id))
      .toEqual(["alpha", "bravo", "charlie"]);
  });

  test("ignores navigation while a text field is focused unless host overrides it", () => {
    const editor = createSheetEditor({
      columns: [{ id: "name", label: "Name" }],
      rows: [
        { id: "row-1", cells: { name: "Alpha" } },
        { id: "row-2", cells: { name: "Beta" } },
      ],
    });
    editor.dispatch({ type: "selection.set", rowId: "row-1", columnId: "name" });

    function View() {
      const editing = useEditing({
        source: editor,
        selectedKeys: editor.selectedCells.map((cell) => `${cell.rowId}:${cell.columnId}`),
        onSelect: (key, mode) => {
          const [rowId, columnId] = key.split(":") as [string, string];
          editor.dispatch({ type: "selection.set", rowId, columnId, mode });
        },
        keyboard: {
          resolve: resolveStroke,
          focusKey: () => {
            const focus = editor.snapshot.selection.focus;
            return focus ? `${focus.rowId}:${focus.columnId}` : undefined;
          },
          neighbor: (key, command) => command.type === "move" && command.direction === "down" ? "row-2:name" : key,
        },
      });
      return (
        <div>
          <input aria-label="cell" defaultValue="Alpha" onKeyDown={editing.getKeyDownHandler()} />
        </div>
      );
    }

    render(<View />);
    fireEvent.keyDown(screen.getByLabelText("cell"), { key: "ArrowDown" });
    expect(editor.snapshot.selection.focus).toEqual({ rowId: "row-1", columnId: "name" });
  });

  test("leaves Enter and Space activation on nested native controls", () => {
    const commands: string[] = [];
    const activations: string[] = [];

    function View() {
      const editing = useEditing({
        selectedKeys: ["alpha"],
        focusKey: "alpha",
        onSelect: (_key, mode) => commands.push(mode),
        keyboard: {
          resolve: (stroke) => stroke.key === " " ? { type: "toggle" } : null,
          focusKey: () => "alpha",
          neighbor: () => null,
        },
      });
      return (
        <div onKeyDown={editing.getKeyDownHandler()}>
          <button type="button" onClick={() => activations.push("click")}>Disclosure</button>
        </div>
      );
    }

    render(<View />);
    const button = screen.getByRole("button", { name: "Disclosure" });
    fireEvent.keyDown(button, { key: " " });
    fireEvent.keyUp(button, { key: " " });
    fireEvent.click(button);
    expect(commands).toEqual([]);
    expect(activations).toEqual(["click"]);
  });

  test("keeps structural commands on composite items rendered with a native element", () => {
    const modes: string[] = [];
    function View() {
      const editing = useEditing({
        selectedKeys: ["alpha"],
        focusKey: "alpha",
        onSelect: (_key, mode) => modes.push(mode),
        keyboard: {
          resolve: (stroke) => stroke.key === " " ? { type: "toggle" } : null,
          focusKey: () => "alpha",
          neighbor: () => null,
        },
      });
      return <button role="option" aria-selected="true" onKeyDown={editing.getKeyDownHandler()}>Alpha</button>;
    }
    render(<View />);
    fireEvent.keyDown(screen.getByRole("option", { name: "Alpha" }), { key: " " });
    expect(modes).toEqual(["toggle"]);
  });

  test("moves text offset inside a field without changing the object neighbor", () => {
    const editor = createDocumentEditor({
      blocks: [{ id: "alpha", text: "Alpha" }],
    });
    let offset = 3;
    const offsets: number[] = [];

    function View() {
      const editing = useEditing({
        source: editor,
        selectedKeys: editor.selectedBlockIds,
        focusKey: "alpha",
        textOffset: offset,
        onSelect: (key, mode) => {
          editor.dispatch({ type: "selection.set", blockId: key, mode });
        },
        keyboard: {
          resolve: resolveStroke,
          focusKey: () => "alpha",
          neighbor: () => "gone",
          text: {
            offset: () => offset,
            length: () => 5,
            onOffset: (next) => {
              offset = next;
              offsets.push(next);
              editor.dispatch({ type: "selection.set", blockId: "alpha", offset: next });
            },
          },
        },
      });
      return <textarea aria-label="text" defaultValue="Alpha" onKeyDown={editing.getKeyDownHandler()} />;
    }

    render(<View />);
    fireEvent.keyDown(screen.getByLabelText("text"), { key: "ArrowLeft" });
    expect(offsets).toEqual([2]);
    expect(offset).toBe(2);
  });
});
