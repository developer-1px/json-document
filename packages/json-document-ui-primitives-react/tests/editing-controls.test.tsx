import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { EditingControls, WindowDock } from "../src/index.js";

afterEach(cleanup);

test("bounded choices support keyboard selection without triggering the agent request", () => {
  const change = vi.fn(), request = vi.fn();
  render(<EditingControls label="편집" choices={[{ id: "size", label: "크기", value: "small", options: [{ id: "small", label: "작게" }, { id: "large", label: "크게" }], onValueChange: change }]} onRequestEdit={request} />);
  fireEvent.click(screen.getByRole("button", { name: "크기" }));
  fireEvent.keyDown(screen.getByRole("listbox"), { key: "ArrowDown" });
  fireEvent.keyDown(screen.getByRole("listbox"), { key: "Enter" });
  expect(change).toHaveBeenCalledWith("large");
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "AI에게 수정 요청" }));
  expect(request).toHaveBeenCalledOnce();
});

test("a new activation reopens the same collapsed window without losing its draft", () => {
  const props = { label: "대화 창", activeId: "chat", onActivate: vi.fn(), items: [{ id: "chat", title: "대화", content: <input aria-label="요청" defaultValue="작성 중" /> }] };
  const { rerender } = render(<WindowDock {...props} activationKey="first" />);
  fireEvent.click(screen.getByRole("button", { name: "대화 접기" }));
  expect(screen.queryByRole("textbox")).toBeNull();
  rerender(<WindowDock {...props} activationKey="second" />);
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("작성 중");
});
