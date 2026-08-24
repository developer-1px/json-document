import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { FileDropRegion, Menu, Select } from "../src/index.js";

afterEach(cleanup);

describe("UI Primitives", () => {
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
});
