import { expect, test } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createTextEditor, createTextEditorTools } from "../src/index.js";

test("document tools append and replace through undo history", () => {
  const editor = createTextEditor(createJSONDocument({ source: "# 제목\n\n첫 문장" }), "/source");
  const [read, edit] = createTextEditorTools(editor);
  expect(edit!.execute({ before: "", after: "추가" })).toEqual({ ok: false, code: "text.read-required" });
  read!.execute({});
  expect(edit!.execute({ before: "", after: "\n\n두 번째 문장" })).toMatchObject({ ok: true });
  expect(edit!.execute({ before: "첫 문장", after: "다듬은 문장" })).toMatchObject({ ok: true });
  expect(editor.text).toBe("# 제목\n\n다듬은 문장\n\n두 번째 문장");
  editor.undo();
  expect(editor.text).toBe("# 제목\n\n첫 문장\n\n두 번째 문장");
});

test("document tools reject stale, ambiguous, missing and malformed edits", () => {
  const editor = createTextEditor(createJSONDocument("같은 말, 같은 말"));
  const [read, edit] = createTextEditorTools(editor);
  read!.execute({});
  expect(edit!.execute({ before: "같은 말", after: "새 말" })).toMatchObject({ code: "text.ambiguous-match" });
  expect(edit!.execute({ before: "없음", after: "새 말" })).toMatchObject({ code: "text.match-not-found" });
  expect(edit!.execute({ after: 1 })).toMatchObject({ code: "text.invalid-edit" });
  editor.insert("사용자 입력");
  expect(edit!.execute({ before: "", after: "추가" })).toMatchObject({ code: "text.stale-source" });
  expect(editor.text).toContain("사용자 입력");
});

for (const [text, anchor, placement, expected] of [
  ["셋\n\n", "하나\n\n", "before", "셋\n\n하나\n\n둘\n\n"],
  ["하나\n\n", "셋\n\n", "after", "둘\n\n셋\n\n하나\n\n"],
  ["둘\n\n", "", "before", "둘\n\n하나\n\n셋\n\n"],
  ["둘\n\n", "", "after", "하나\n\n셋\n\n둘\n\n"],
] as const) {
  test(`move ${text.trim()} ${placement} ${anchor.trim() || "boundary"} preserves content and one-step undo`, () => {
    const original = "하나\n\n둘\n\n셋\n\n";
    const editor = createTextEditor(createJSONDocument(original));
    const [read, , move] = createTextEditorTools(editor);
    read!.execute({});
    expect(move!.execute({ text, anchor, placement })).toMatchObject({ ok: true });
    expect(editor.text).toBe(expected);
    editor.undo();
    expect(editor.text).toBe(original);
    editor.redo();
    expect(editor.text).toBe(expected);
  });
}

test("move refuses invalid, ambiguous, overlapping and stale requests without modifying source", () => {
  const original = "alpha beta alpha gamma";
  const editor = createTextEditor(createJSONDocument(original));
  const [read, , move] = createTextEditorTools(editor);
  expect(move!.execute({ text: "beta", anchor: "", placement: "before" })).toMatchObject({ code: "text.read-required" });
  read!.execute({});
  for (const [args, code] of [
    [{ text: "", anchor: "", placement: "before" }, "text.invalid-move"],
    [{ text: "beta", anchor: "", placement: "inside" }, "text.invalid-move"],
    [{ text: "absent", anchor: "", placement: "before" }, "text.match-not-found"],
    [{ text: "alpha", anchor: "", placement: "before" }, "text.ambiguous-match"],
    [{ text: "beta", anchor: "absent", placement: "before" }, "text.anchor-not-found"],
    [{ text: "beta", anchor: "alpha", placement: "before" }, "text.ambiguous-anchor"],
    [{ text: "beta", anchor: "beta alpha", placement: "before" }, "text.overlapping-move"],
  ]) {
    expect(move!.execute(args)).toMatchObject({ ok: false, code });
    expect(editor.text).toBe(original);
  }
  editor.insert("user ");
  expect(move!.execute({ text: "beta", anchor: "", placement: "after" })).toMatchObject({ code: "text.stale-source" });
  expect(editor.text).toBe("user " + original);
});

test("a move updates the read source for a subsequent edit", () => {
  const editor = createTextEditor(createJSONDocument("A\nB\n"));
  const [read, edit, move] = createTextEditorTools(editor);
  read!.execute({});
  move!.execute({ text: "B\n", anchor: "A\n", placement: "before" });
  expect(edit!.execute({ before: "A", after: "C" })).toMatchObject({ ok: true });
  expect(editor.text).toBe("B\nC\n");
});

test("writing tools find passages and read directional selection without changing it", () => {
  const editor = createTextEditor(createJSONDocument("AI와 글. AI와 검토."));
  editor.select({ anchor: 5, focus: 0 });
  const tools = createTextEditorTools(editor);
  const execute = (name: string, args: unknown) => tools.find(tool => tool.name === name)!.execute(args);
  expect(execute("read_selection", {})).toEqual({ ok: true, text: "AI와 글", selection: { anchor: 5, focus: 0 } });
  expect(execute("find_in_document", { query: "AI" })).toMatchObject({ ok: true, matches: [{ from: 0, to: 2 }, { from: 7, to: 9 }], truncated: false });
  expect(execute("find_in_document", { query: "" })).toMatchObject({ code: "text.invalid-query" });
  expect(execute("find_in_document", { query: "없음" })).toMatchObject({ matches: [] });
  expect(editor.snapshot.selection).toEqual({ anchor: 5, focus: 0 });
  expect(editor.snapshot.canUndo).toBe(false);
});

test("history tools report availability and reject edits made since the last read", () => {
  const editor = createTextEditor(createJSONDocument("초안"));
  const tools = createTextEditorTools(editor);
  const execute = (name: string, args: unknown = {}) => tools.find(tool => tool.name === name)!.execute(args);
  expect(execute("undo_document")).toMatchObject({ code: "text.read-required" });
  execute("read_document");
  expect(execute("undo_document")).toMatchObject({ code: "text.history-unavailable" });
  execute("edit_document", { before: "초안", after: "수정" });
  expect(execute("undo_document")).toMatchObject({ source: "초안", canRedo: true });
  expect(execute("redo_document")).toMatchObject({ source: "수정", canRedo: false });
  editor.insert("직접 입력");
  expect(execute("undo_document")).toMatchObject({ code: "text.stale-source" });
});
