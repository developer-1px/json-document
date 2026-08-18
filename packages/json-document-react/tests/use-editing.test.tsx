import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { createDocumentEditor, createSheetEditor } from "@interactive-os/json-document-editing";
import { useEditing, type EditingKeyboardCommand, type EditingKeyboardStroke } from "../src/index.js";

afterEach(cleanup);

function resolveStroke(stroke: EditingKeyboardStroke): EditingKeyboardCommand | null {
  if (stroke.key === "ArrowDown") return { type: "move", direction: "down", operation: stroke.shiftKey ? "extend" : "replace" };
  if (stroke.key === " ") return { type: "toggle" };
  if (stroke.key === "Delete" || stroke.key === "Backspace") return { type: "delete" };
  if (stroke.key === "z" && (stroke.metaKey || stroke.ctrlKey) && stroke.shiftKey) return { type: "redo" };
  if (stroke.key === "z" && (stroke.metaKey || stroke.ctrlKey)) return { type: "undo" };
  return null;
}

describe("useEditing", () => {
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
});
