import {afterEach, expect, it} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {RecordWorkspace} from "../src/record-workspace.js";
import {SelectableItem} from "../src/controls.js";

afterEach(cleanup);
it("returns keyboard focus to the source item without consuming editor Escape", async () => {
  render(<RecordWorkspace list={<SelectableItem selected>첫 이슈</SelectableItem>} detailHeader={<h2>첫 이슈 상세</h2>} detail={<form><input aria-label="본문" /></form>}/>);
  const item = screen.getByRole("button", {name: "첫 이슈"});
  fireEvent.keyDown(item, {key: "Enter"});
  const header = screen.getByText("첫 이슈 상세").closest("header")!;
  await waitFor(() => expect(document.activeElement).toBe(header));
  const input = screen.getByRole("textbox", {name: "본문"});
  input.focus(); fireEvent.keyDown(input, {key: "Escape"});
  expect(document.activeElement).toBe(input);
  header.focus(); fireEvent.keyDown(header, {key: "Escape"});
  expect(document.activeElement).toBe(item);
});
it("keeps navigation while removing selected-record controls when no item is selected", () => {
  render(<RecordWorkspace hasSelection={false} list={<p>빈 목록</p>} detailHeader={<button>제목 수정</button>} detail={<textarea aria-label="본문" />} properties={<input aria-label="담당자"/>}/>);
  expect(screen.getByText("빈 목록")).toBeDefined();
  expect(screen.getByRole("status").textContent).toContain("항목을 선택");
  expect(screen.queryByRole("button", {name: "제목 수정"})).toBeNull();
  expect(screen.queryByRole("textbox", {name: "본문"})).toBeNull();
});
