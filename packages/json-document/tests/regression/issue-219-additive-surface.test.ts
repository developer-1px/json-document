// #219 이행 1단계a — additive 표면:
// invalid_target 3분할, selectAll, history.clear, canQuery, missing_offsets.

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createJSONDocument, replaceTextSurfaceSelection } from "@interactive-os/json-document";

const Schema = z.object({
  items: z.array(z.object({ id: z.string() })),
  meta: z.object({ title: z.string() }),
});

const initial = { items: [{ id: "a" }, { id: "b" }], meta: { title: "t" } };

describe("#219 invalid_target — 구문/부재/종류 3분할", () => {
  const doc = createJSONDocument(Schema, initial);

  it("insert into: 구문 위반 → invalid_pointer", () => {
    expect(doc.canInsert({ into: "items" }, { id: "x" })).toMatchObject({ ok: false, code: "invalid_pointer" });
  });
  it("insert into: 부재 → path_not_found", () => {
    expect(doc.canInsert({ into: "/missing" }, { id: "x" })).toMatchObject({ ok: false, code: "path_not_found" });
  });
  it("insert into: 존재하나 비배열 → invalid_target", () => {
    expect(doc.canInsert({ into: "/meta" }, { id: "x" })).toMatchObject({ ok: false, code: "invalid_target" });
  });
  it("insert after: 배열 아이템 아님 → invalid_target", () => {
    expect(doc.canInsert({ after: "/items" }, { id: "x" })).toMatchObject({ ok: false, code: "invalid_target" });
  });
  it("move into: 부재 → path_not_found", () => {
    expect(doc.canMove("/items/0", { into: "/missing" })).toMatchObject({ ok: false, code: "path_not_found" });
  });
  it("move into: 존재하나 비배열 → invalid_target", () => {
    expect(doc.canMove("/items/0", { into: "/meta" })).toMatchObject({ ok: false, code: "invalid_target" });
  });
  it("move after: 배열 아이템 아님 → invalid_target", () => {
    expect(doc.canMove("/items/0", { after: "/items" })).toMatchObject({ ok: false, code: "invalid_target" });
  });
});

describe("#219 selection.selectAll — 42년 동사 (selectScope alias)", () => {
  it("scope 안 전체 선택", () => {
    const doc = createJSONDocument(Schema, initial, { selection: { mode: "multiple" } });
    const r = doc.selection!.selectAll({ scope: "/items" });
    expect(r.ok).toBe(true);
    expect(doc.selection!.selectedPointers).toContain("/items/0");
    expect(doc.selection!.selectedPointers).toContain("/items/1");
    expect(doc.selection!.hasSelection).toBe(true);
  });

  it("selectScope 와 동일 결과", () => {
    const a = createJSONDocument(Schema, initial, { selection: { mode: "multiple" } });
    const b = createJSONDocument(Schema, initial, { selection: { mode: "multiple" } });
    a.selection!.selectAll({ scope: "/items" });
    b.selection!.selectScope({ scope: "/items" });
    expect(a.selection!.selectedPointers).toEqual(b.selection!.selectedPointers);
  });
});

describe("#219 history.clear — removeAllActions 계보", () => {
  it("undo/redo 스택을 비운다", () => {
    const doc = createJSONDocument(Schema, initial, { history: 10 });
    doc.replace("/meta/title", "u1");
    doc.replace("/meta/title", "u2");
    doc.undo();
    expect(doc.history.canUndo).toBe(true);
    expect(doc.history.canRedo).toBe(true);
    doc.history.clear();
    expect(doc.history.canUndo).toBe(false);
    expect(doc.history.canRedo).toBe(false);
    expect(doc.history.undoDepth).toBe(0);
    expect(doc.history.redoDepth).toBe(0);
    // 문서 값은 그대로
    expect(doc.value.meta.title).toBe("u1");
  });
});

describe("#219 canQuery — query 의 probe 이름", () => {
  const doc = createJSONDocument(Schema, initial);
  it("canFind 와 동일 판정", () => {
    expect(doc.canQuery("$.items[*].id")).toEqual({ ok: true });
    expect(doc.canQuery("$[invalid")).toMatchObject({ ok: false });
    expect(doc.canQuery("$.items[*].id")).toEqual(doc.canFind("$.items[*].id"));
  });
});

describe("#219 missing_offsets — missing_selection 2원인 분리", () => {
  const TextSchema = z.object({ text: z.string() });
  const surface = { textPath: "/text" as const };

  it("primary range 없음 → missing_selection", () => {
    const doc = createJSONDocument(TextSchema, { text: "hello" }, { selection: true });
    const r = replaceTextSurfaceSelection(doc.selection!.snapshot(), doc.value, surface, "X");
    expect(r).toMatchObject({ ok: false, code: "missing_selection" });
  });

  it("point 에 offset 없음 → missing_offsets", () => {
    const doc = createJSONDocument(TextSchema, { text: "hello" }, { selection: true });
    doc.selection!.collapse("/text"); // offset 없는 pointer point
    const r = replaceTextSurfaceSelection(doc.selection!.snapshot(), doc.value, surface, "X");
    expect(r).toMatchObject({ ok: false, code: "missing_offsets" });
  });
});
