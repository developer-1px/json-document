import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useState } from "react";
import {
  ActionButton,
  ChoiceChip,
  ContextualControls,
  ControlHandle,
  DragHandle,
  DisclosureButton,
  FileDropRegion,
  formatFileSize,
  GridCell,
  IconButton,
  Menu,
  ResizeHandle,
  Select,
  SelectableItem,
  SegmentedControl,
  Tabs,
  ToggleButton,
  useListbox,
} from "../src/index.js";

afterEach(cleanup);

describe("UI Primitives", () => {
  test("ContextualControls reveals the same capability by pointer approach and keyboard focus", () => {
    const capabilities = [{ id: "navigate", phases: ["approach"] }] as const;
    render(
      <ContextualControls capabilities={capabilities}>
        {(snapshot) => <button>{snapshot.visible.includes("navigate") ? "Previous" : "Calendar"}</button>}
      </ContextualControls>,
    );
    const root = screen.getByText("Calendar").parentElement!;
    fireEvent.pointerEnter(root);
    expect(screen.getByRole("button", { name: "Previous" })).toBeTruthy();
    fireEvent.pointerLeave(root);
    fireEvent.focus(screen.getByRole("button", { name: "Calendar" }));
    expect(screen.getByRole("button", { name: "Previous" })).toBeTruthy();
  });

  test("formats file metadata with one canonical compact unit policy", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("2 KB");
    expect(formatFileSize(1024 * 1024 * 1.25)).toBe("1.3 MB");
    expect(() => formatFileSize(-1)).toThrow(RangeError);
  });

  test("Listbox keeps active and selected separate across keyboard, typeahead, pointer, and action", async () => {
    const user = userEvent.setup();
    const actions = vi.fn();
    const items = [
      { id: "a", textValue: "Alpha" },
      { id: "blocked", textValue: "Blocked", disabled: true },
      { id: "b/c", textValue: "Beta" },
    ] as const;
    function Harness() {
      const [activeId, setActiveId] = useState<string | null>("a");
      const listbox = useListbox({
        id: "commands",
        label: "Commands",
        items,
        activeId,
        selectedId: "a",
        onActiveChange: setActiveId,
        onAction: actions,
      });
      return <><input aria-label="Reference" {...listbox.referenceProps} /><div tabIndex={-1} {...listbox.listboxProps}>
        {items.map((item) => <button key={item.id} {...listbox.optionProps(item)}>{item.textValue}</button>)}
      </div></>;
    }
    render(<Harness />);
    const reference = screen.getByRole("textbox", { name: "Reference" });
    reference.focus();
    await user.keyboard("{ArrowDown}");
    expect(reference.getAttribute("aria-activedescendant")).toBe("commands-option-b%2Fc");
    expect(screen.getByRole("option", { name: "Alpha" }).getAttribute("aria-selected")).toBe("true");
    await user.keyboard("a");
    expect(reference.getAttribute("aria-activedescendant")).toBe("commands-option-a");
    await user.hover(screen.getByRole("option", { name: "Beta" }));
    expect(reference.getAttribute("aria-activedescendant")).toBe("commands-option-b%2Fc");
    await user.keyboard("{Enter}");
    expect(actions).toHaveBeenCalledWith("b/c");
    expect((screen.getByRole("option", { name: "Blocked" }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("control primitives project their reusable button and state contracts", () => {
    render(
      <>
        <ActionButton>Action</ActionButton>
        <ActionButton type="submit">Submit</ActionButton>
        <ToggleButton pressed>Toggle</ToggleButton>
        <IconButton label="Copy">□</IconButton>
        <ChoiceChip selected>Compact</ChoiceChip>
        <SelectableItem selected focus>Item</SelectableItem>
        <DisclosureButton expanded controls="panel">Details</DisclosureButton>
      </>,
    );

    expect(screen.getByRole("button", { name: "Action" }).getAttribute("type")).toBe("button");
    expect(screen.getByRole("button", { name: "Submit" }).getAttribute("type")).toBe("submit");
    expect(screen.getByRole("button", { name: "Toggle" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Copy" }).getAttribute("aria-describedby")).toBe(
      screen.getByRole("tooltip", { name: "Copy" }).id,
    );
    expect(screen.getByRole("button", { name: "Compact" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Item" }).dataset).toMatchObject({ selected: "true", focus: "true" });
    expect(screen.getByRole("button", { name: "Details" }).getAttribute("aria-controls")).toBe("panel");
    expect(screen.getByRole("button", { name: "Details" }).getAttribute("aria-expanded")).toBe("true");
  });

  test("ActionButton can preserve an editing surface focus during pointer activation", () => {
    render(<><div contentEditable role="textbox" /><ActionButton preserveFocus>Format</ActionButton></>);
    const editor = screen.getByRole("textbox");
    editor.focus();

    expect(fireEvent.mouseDown(screen.getByRole("button", { name: "Format" }))).toBe(false);
    expect(document.activeElement).toBe(editor);
  });

  test("SegmentedControl keeps one choice and supports arrow navigation", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(value: "canvas" | "json") => void>();
    render(<SegmentedControl label="View" value="canvas" options={[{ id: "canvas", label: "Canvas" }, { id: "json", label: "JSON" }]} onValueChange={onValueChange} />);
    const canvas = screen.getByRole("radio", { name: "Canvas" });
    canvas.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith("json");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "JSON" }));
  });

  test("editing controls can preserve the active surface focus on pointer activation", () => {
    render(<IconButton preserveFocus label="Strong">B</IconButton>);
    expect(fireEvent.mouseDown(screen.getByRole("button", { name: "Strong" }))).toBe(false);
  });

  test("Tabs owns selection semantics and roving keyboard focus", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState<"demo" | "source">("demo");
      return <Tabs label="Demo views" value={value} options={[{ id: "demo", label: "Demo" }, { id: "source", label: "Source" }]} onValueChange={setValue} tabId={(id) => `tab-${id}`} panelId={(id) => `panel-${id}`} />;
    }
    render(<Harness />);
    const demo = screen.getByRole("tab", { name: "Demo" });
    demo.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Source" }).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Source" }));
  });

  test("Select completes keyboard selection, cancellation, disabled options, and focus restoration", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Select label="모델 선택" value="a" options={[{ id: "a", label: "Alpha" }, { id: "blocked", label: "Blocked", disabled: true }, { id: "b", label: "Beta" }]} onValueChange={onValueChange} />);
    const trigger = screen.getByRole("button", { name: "모델 선택" });
    await user.click(trigger);
    const listbox = screen.getByRole("listbox", { name: "모델 선택" });
    expect(document.activeElement).toBe(listbox);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("b");
    expect(document.activeElement).toBe(trigger);
    await user.click(trigger);
    expect((screen.getByRole("option", { name: "Blocked" }) as HTMLButtonElement).disabled).toBe(true);
    await user.keyboard("{Escape}");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(trigger);
  });

  test("Menu moves through enabled actions and restores trigger focus", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Menu label="추가" trigger="＋" items={[{ id: "file", label: "파일" }, { id: "skill", label: "스킬" }]} onAction={onAction} />);
    const trigger = screen.getByRole("button", { name: "추가" });
    await user.click(trigger);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onAction).toHaveBeenCalledWith("skill");
    expect(document.activeElement).toBe(trigger);
  });

  test("FileDropRegion publishes dropped files and clears its active state", () => {
    const onFiles = vi.fn();
    render(<FileDropRegion aria-label="첨부" overlay={<span>놓기</span>} onFiles={onFiles}>내용</FileDropRegion>);
    const region = screen.getByLabelText("첨부");
    const file = new File(["draft"], "draft.md", { type: "text/markdown" });
    fireEvent.dragEnter(region, { dataTransfer: { files: [file] } });
    expect(screen.getByText("놓기")).toBeTruthy();
    fireEvent.drop(region, { dataTransfer: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
    expect(screen.queryByText("놓기")).toBeNull();
  });

  test("GridCell projects selection and ResizeHandle publishes preview and commit", () => {
    const onResize = vi.fn();
    render(<table><tbody><tr><GridCell selected focus>Cell</GridCell></tr></tbody></table>);
    expect(screen.getByRole("gridcell").getAttribute("aria-selected")).toBe("true");

    render(<ResizeHandle label="열 너비 조절" orientation="horizontal" onResize={onResize} />);
    const handle = screen.getByRole("button", { name: "열 너비 조절" });
    let captured: number | null = null;
    Object.assign(handle, {
      setPointerCapture: (pointerId: number) => { captured = pointerId; },
      hasPointerCapture: (pointerId: number) => captured === pointerId,
      releasePointerCapture: () => { captured = null; },
    });
    fireEvent.pointerDown(handle, { pointerId: 7, clientX: 10 });
    fireEvent.pointerMove(handle, { pointerId: 7, clientX: 24 });
    fireEvent.pointerUp(handle, { pointerId: 7, clientX: 30 });
    expect(onResize).toHaveBeenNthCalledWith(1, 14, "preview");
    expect(onResize).toHaveBeenNthCalledWith(2, 20, "commit");

    const onLostResize = vi.fn();
    const onLostHandle = vi.fn();
    render(<ResizeHandle label="행 높이 조절" orientation="vertical" onResize={onLostResize} onHandle={onLostHandle} />);
    const lost = screen.getByRole("button", { name: "행 높이 조절" });
    let capturedLost: number | null = null;
    Object.assign(lost, {
      setPointerCapture: (pointerId: number) => { capturedLost = pointerId; },
      hasPointerCapture: (pointerId: number) => capturedLost === pointerId,
      releasePointerCapture: () => { capturedLost = null; },
    });
    fireEvent.pointerDown(lost, { pointerId: 8, clientY: 10 });
    fireEvent.pointerMove(lost, { pointerId: 8, clientY: 40 });
    fireEvent.lostPointerCapture(lost, { pointerId: 8, clientY: 40 });
    expect(onLostResize).toHaveBeenCalledOnce();
    expect(onLostResize).toHaveBeenCalledWith(30, "preview");
    expect(onLostHandle).toHaveBeenLastCalledWith(expect.objectContaining({
      phase: "cancel",
      reason: "lost-capture",
    }));
  });

  test("DragHandle and ControlHandle share typed lifecycle, delta, and cursor binding", () => {
    const onDrag = vi.fn();
    const onControl = vi.fn();
    render(<>
      <DragHandle label="카드 이동" descriptor={{ kind: "drag", axis: "x" }} onHandle={onDrag} />
      <ControlHandle label="제어점 이동" onHandle={onControl} />
    </>);
    const drag = screen.getByRole("button", { name: "카드 이동" });
    const control = screen.getByRole("button", { name: "제어점 이동" });
    for (const handle of [drag, control]) {
      let captured: number | null = null;
      Object.assign(handle, {
        setPointerCapture: (pointerId: number) => { captured = pointerId; },
        hasPointerCapture: (pointerId: number) => captured === pointerId,
        releasePointerCapture: () => { captured = null; },
      });
    }
    expect(drag.style.cursor).toBe("grab");
    expect(control.style.cursor).toBe("crosshair");
    fireEvent.pointerDown(drag, { pointerId: 9, clientX: 4, clientY: 5 });
    expect(drag.style.cursor).toBe("grabbing");
    fireEvent.pointerMove(drag, { pointerId: 9, clientX: 14, clientY: 25 });
    fireEvent.pointerUp(drag, { pointerId: 9, clientX: 20, clientY: 30 });
    expect(onDrag.mock.calls.map(([event]) => [event.phase, event.delta])).toEqual([
      ["start", { dx: 0, dy: 0 }],
      ["preview", { dx: 10, dy: 0 }],
      ["commit", { dx: 16, dy: 0 }],
    ]);
    fireEvent.pointerDown(control, { pointerId: 10, clientX: 0, clientY: 0 });
    fireEvent.pointerCancel(control, { pointerId: 10, clientX: 0, clientY: 0 });
    expect(onControl.mock.calls.map(([event]) => event.phase)).toEqual(["start", "cancel"]);
  });
});
