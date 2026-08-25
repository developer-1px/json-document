import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useState } from "react";
import {
  ActionButton,
  DisclosureButton,
  FileDropRegion,
  GridCell,
  IconButton,
  Menu,
  ResizeHandle,
  Select,
  SelectableItem,
  ToggleButton,
  useListbox,
} from "../src/index.js";

afterEach(cleanup);

describe("UI Primitives", () => {
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
        <SelectableItem selected focus>Item</SelectableItem>
        <DisclosureButton expanded controls="panel">Details</DisclosureButton>
      </>,
    );

    expect(screen.getByRole("button", { name: "Action" }).getAttribute("type")).toBe("button");
    expect(screen.getByRole("button", { name: "Submit" }).getAttribute("type")).toBe("submit");
    expect(screen.getByRole("button", { name: "Toggle" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Copy" }).getAttribute("title")).toBe("Copy");
    expect(screen.getByRole("button", { name: "Item" }).dataset).toMatchObject({ selected: "true", focus: "true" });
    expect(screen.getByRole("button", { name: "Details" }).getAttribute("aria-controls")).toBe("panel");
    expect(screen.getByRole("button", { name: "Details" }).getAttribute("aria-expanded")).toBe("true");
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
  });
});
