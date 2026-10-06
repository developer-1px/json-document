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
