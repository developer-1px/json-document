import {afterEach, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {EditableText} from "../src/editable-text.js";

afterEach(cleanup);
it("never commits a cancelled draft or carries it to another record with the same value", () => {
  const commit = vi.fn();
  const view = render(<EditableText label="본문" value="같은 본문" identity="first" onCommit={commit}/>);
  fireEvent.click(screen.getByRole("button", {name: "본문 편집"}));
  fireEvent.change(screen.getByRole("textbox", {name: "본문"}), {target: {value: "저장하지 않은 초안"}});
  view.rerender(<EditableText label="본문" value="같은 본문" identity="second" onCommit={commit}/>);
  expect(screen.queryByRole("textbox", {name: "본문"})).toBeNull();
  expect(commit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name: "본문 편집"}));
  fireEvent.change(screen.getByRole("textbox", {name: "본문"}), {target: {value: "취소할 초안"}});
  fireEvent.keyDown(screen.getByRole("textbox", {name: "본문"}), {key: "Escape"});
  expect(screen.queryByRole("textbox", {name: "본문"})).toBeNull();
  expect(commit).not.toHaveBeenCalled();
});
it("keeps a rejected draft available and commits only through save", () => {
  const commit = vi.fn(() => false);
  render(<EditableText label="본문" value="기존 본문" identity="first" onCommit={commit}/>);
  fireEvent.click(screen.getByRole("button", {name: "본문 편집"}));
  fireEvent.change(screen.getByRole("textbox", {name: "본문"}), {target: {value: "새 본문"}});
  expect(commit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name: "저장"}));
  expect(commit).toHaveBeenCalledWith("새 본문");
  expect((screen.getByRole("textbox", {name: "본문"}) as HTMLTextAreaElement).value).toBe("새 본문");
});
