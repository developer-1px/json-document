import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createRef, useState } from "react";
import {
  Check,
  Choice,
  Command,
  ContextualControls,
  ControlHandle,
  Dialog,
  DragHandle,
  DisclosureButton,
  FileDropRegion,
  Field,
  GridCell,
  Menu,
  ProductShell,
  Popover,
  ResizeHandle,
  SelectableItem,
  Search,
  Tabs,
  Toolbar,
  ToolbarGroup,
  ToolbarLayout,
  ToolbarRegion,
  ToolbarSeparator,
  ToolbarSpacer,
  Toggle,
  ValueInput,
  useListbox,
} from "../src/index.js";

afterEach(cleanup);

describe("UI Primitives", () => {
  test("projects product affordance without changing the semantic control role", () => {
    render(<>
      <Command affordance="persistent">Today</Command>
      <Toggle affordance="stateful" pressed={true}>Work</Toggle>
      <SelectableItem affordance="content-control" selected={false}>Event</SelectableItem>
      <ResizeHandle affordance="direct" label="Resize end" orientation="vertical" onResize={() => undefined} />
    </>);
    expect(screen.getByRole("button", { name: "Today" }).getAttribute("data-ui-affordance")).toBe("persistent");
    expect(screen.getByRole("button", { name: "Work" }).getAttribute("data-ui-affordance")).toBe("stateful");
    expect(screen.getByRole("button", { name: "Event" }).getAttribute("data-ui-affordance")).toBe("content-control");
    expect(screen.getByRole("button", { name: "Resize end" }).getAttribute("data-ui-affordance")).toBe("direct");
    expect(screen.getByRole("button", { name: "Resize end" }).getAttribute("data-ui-orientation")).toBe("vertical");
  });

  test("role inputs preserve native semantics without parallel shape APIs", async () => {
    const user = userEvent.setup();
    const checked = vi.fn<(value: boolean) => void>();
    const text = vi.fn<(value: string) => void>();
    const query = vi.fn<(value: string) => void>();
    const value = vi.fn<(value: number) => void>();
    render(<>
      <Check label="Select row" checked={false} onCheckedChange={checked} />
      <Field label="Title" value="" onValueChange={text} />
      <Search label="Search documents" query="" onQueryChange={query} />
      <ValueInput label="Zoom" value={50} min={0} max={100} presentation="continuous" onValueChange={value} />
      <ValueInput label="Copies" value={2} min={1} max={3} presentation="stepped" onValueChange={value} />
    </>);
    await user.click(screen.getByRole("checkbox", { name: "Select row" }));
    await user.type(screen.getByRole("textbox", { name: "Title" }), "D");
    await user.type(screen.getByRole("searchbox", { name: "Search documents" }), "j");
    fireEvent.change(screen.getByRole("slider", { name: "Zoom" }), { target: { value: "75" } });
    await user.click(screen.getByRole("button", { name: "Increase Copies" }));
    expect(checked).toHaveBeenCalledWith(true);
    expect(text).toHaveBeenCalledWith("D");
    expect(query).toHaveBeenCalledWith("j");
    expect(value).toHaveBeenCalledWith(75);
    expect(value).toHaveBeenCalledWith(3);
  });

  test("Field preserves native input and textarea interaction boundaries", () => {
    const inputRef = createRef<HTMLInputElement>();
    const textareaRef = createRef<HTMLTextAreaElement>();
    const blur = vi.fn();
    render(<>
      <Field label="Title" value="Draft" onValueChange={() => undefined} controlRef={inputRef} autoFocus onBlur={blur} />
      <Field label="Notes" value="Review" onValueChange={() => undefined} controlRef={textareaRef} multiline presentation="seamless" rows={2} />
    </>);
    expect(inputRef.current).toBe(screen.getByRole("textbox", { name: "Title" }));
    expect(textareaRef.current).toBe(screen.getByRole("textbox", { name: "Notes" }));
    expect(textareaRef.current?.rows).toBe(2);
    expect(textareaRef.current?.getAttribute("data-ui-presentation")).toBe("seamless");
    fireEvent.blur(inputRef.current!);
    expect(blur).toHaveBeenCalledOnce();
  });

  test("presentation roles close on Escape", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [popover, setPopover] = useState(false);
      const [dialog, setDialog] = useState(true);
      return <>
        <Popover label="Formatting" open={popover} onOpenChange={setPopover} trigger="Format"><span>Options</span></Popover>
        <Dialog label="Delete document" open={dialog} onOpenChange={setDialog}><span>Confirm</span></Dialog>
      </>;
    }
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Formatting" }));
    const popover = screen.getByRole("dialog", { name: "Formatting" });
    popover.focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Formatting" })).toBeNull();
    screen.getByRole("dialog", { name: "Delete document" }).focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Delete document" })).toBeNull();
  });

  test("Dialog moves focus inside, traps Tab, and restores the invoking control", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return <>
        <Command onClick={() => setOpen(true)}>Open dialog</Command>
        <Dialog label="Confirm" open={open} onOpenChange={setOpen} presentation="sheet">
          <Command>First</Command>
          <Command onClick={() => setOpen(false)}>Last</Command>
        </Dialog>
      </>;
    }
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));
    screen.getByRole("button", { name: "Last" }).focus();
    await user.keyboard("{Tab}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(trigger);
  });

  test("ProductShell and Toolbar expose one structural composition contract", () => {
    render(
      <ProductShell
        fill
        toolbar={(
          <>
            <ToolbarGroup label="Navigation"><Command>Today</Command></ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarSpacer />
            <ToolbarGroup label="History"><Command label="Undo">↶</Command></ToolbarGroup>
          </>
        )}
        toolbarLabel="Calendar controls"
        inspector={<p>Inspector</p>}
      >
        <p>Calendar content</p>
      </ProductShell>,
    );

    expect(screen.getByRole("toolbar", { name: "Calendar controls" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Navigation" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "History" })).toBeTruthy();
    expect(screen.getByRole("separator").getAttribute("aria-orientation")).toBe("vertical");
    expect(screen.getByText("Calendar content").parentElement?.dataset.uiComponent).toBe("product-canvas");
    expect(screen.getByText("Inspector").parentElement?.dataset.uiComponent).toBe("product-inspector");
  });

  test("ProductShell exposes a canonical floating toolbar presentation", () => {
    render(<ProductShell toolbar="Actions" toolbarPresentation="floating">Canvas</ProductShell>);
    expect(screen.getByRole("toolbar").getAttribute("data-ui-presentation")).toBe("floating");
  });

  test("Toolbar can own a standalone action collection", () => {
    render(<Toolbar label="History"><Command>Undo</Command></Toolbar>);
    expect(screen.getByRole("toolbar", { name: "History" })).toBeTruthy();
  });

  test("ToolbarLayout exposes stable start, center, and end regions", () => {
    render(
      <Toolbar label="Calendar controls">
        <ToolbarLayout>
          <ToolbarRegion placement="start" label="Period">2026</ToolbarRegion>
          <ToolbarRegion placement="center" label="View">Week</ToolbarRegion>
          <ToolbarRegion placement="end" label="Actions">Create</ToolbarRegion>
        </ToolbarLayout>
      </Toolbar>,
    );

    expect(screen.getByRole("group", { name: "Period" }).dataset.placement).toBe("start");
    expect(screen.getByRole("group", { name: "View" }).dataset.placement).toBe("center");
    expect(screen.getByRole("group", { name: "Actions" }).dataset.placement).toBe("end");
  });

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
        <Command>Action</Command>
        <Command aria-label="Choose day">27</Command>
        <Command type="submit">Submit</Command>
        <Toggle pressed>Toggle</Toggle>
        <Toggle pressed={false} aria-label="Select block 1">1</Toggle>
        <Command label="Copy">□</Command>
        <Toggle pressed presentation="chip">Compact</Toggle>
        <SelectableItem selected focus>Item</SelectableItem>
        <DisclosureButton expanded controls="panel">Details</DisclosureButton>
      </>,
    );

    expect(screen.getByRole("button", { name: "Action" }).getAttribute("type")).toBe("button");
    expect(screen.getByRole("button", { name: "Choose day" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit" }).getAttribute("type")).toBe("submit");
    expect(screen.getByRole("button", { name: "Toggle" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Select block 1" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Copy" }).getAttribute("aria-describedby")).toBe(
      screen.getByRole("tooltip", { name: "Copy" }).id,
    );
    expect(screen.getByRole("button", { name: "Compact" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Item" }).dataset).toMatchObject({ selected: "true", focus: "true" });
    expect(screen.getByRole("button", { name: "Details" }).getAttribute("aria-controls")).toBe("panel");
    expect(screen.getByRole("button", { name: "Details" }).getAttribute("aria-expanded")).toBe("true");
  });

  test("Command can preserve an editing surface focus during pointer activation", () => {
    render(<><div contentEditable role="textbox" /><Command preserveFocus>Format</Command></>);
    const editor = screen.getByRole("textbox");
    editor.focus();

    expect(fireEvent.mouseDown(screen.getByRole("button", { name: "Format" }))).toBe(false);
    expect(document.activeElement).toBe(editor);
  });

  test("Choice keeps one choice and supports arrow navigation", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(value: "canvas" | "json") => void>();
    render(<Choice presentation="inline" label="View" value="canvas" options={[{ id: "canvas", label: "Canvas" }, { id: "json", label: "JSON" }]} onValueChange={onValueChange} />);
    const canvas = screen.getByRole("radio", { name: "Canvas" });
    canvas.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith("json");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "JSON" }));
  });

  test("editing controls can preserve the active surface focus on pointer activation", () => {
    render(<Command preserveFocus label="Strong">B</Command>);
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

  test("Choice completes keyboard selection, cancellation, disabled options, and focus restoration", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Choice presentation="popup" label="모델 선택" value="a" options={[{ id: "a", label: "Alpha" }, { id: "blocked", label: "Blocked", disabled: true }, { id: "b", label: "Beta" }]} onValueChange={onValueChange} />);
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

  test("Choice dismisses its popup when another product surface is pressed", async () => {
    const user = userEvent.setup();
    render(<><Choice presentation="popup" label="보기" value="week" options={[{ id: "day", label: "Day" }, { id: "week", label: "Week" }]} onValueChange={() => undefined} /><button type="button">일정</button></>);
    await user.click(screen.getByRole("button", { name: "보기" }));
    expect(screen.getByRole("listbox", { name: "보기" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "일정" }));
    expect(screen.queryByRole("listbox", { name: "보기" })).toBeNull();
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
    expect(handle.getAttribute("data-active")).toBeNull();
    fireEvent.pointerDown(handle, { pointerId: 7, clientX: 10 });
    expect(handle.getAttribute("data-active")).toBe("true");
    fireEvent.pointerMove(handle, { pointerId: 7, clientX: 24 });
    fireEvent.pointerUp(handle, { pointerId: 7, clientX: 30 });
    expect(handle.getAttribute("data-active")).toBeNull();
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
