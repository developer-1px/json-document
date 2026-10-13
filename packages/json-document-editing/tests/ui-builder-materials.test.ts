import { describe, expect, it } from "vitest";
import { createUIBuilderEditor } from "../src/ui-builder.js";
import { applyUIBuilderMaterials, readUIBuilderProject, type UIBuilderField } from "../src/ui-builder-materials.js";
import { createUIBuilderMaterialTools } from "../src/ui-builder-material-tools.js";
const field: UIBuilderField = {id: "name", name: "이름", type: "text", options: [], sample: "name"};
function setup() {
  const editor = createUIBuilderEditor({profile: "canvas/1", width: 1200, height: 900, objects: []});
  const read = () => readUIBuilderProject(editor.snapshot.value);
  const apply = (commands: Parameters<typeof applyUIBuilderMaterials>[1]) => applyUIBuilderMaterials(editor, commands, () => "예시");
  return {editor, read, apply};
}
describe("UI builder materials", () => {
  it("migrates canvas documents and shares one history across catalog changes", () => {
    const s = setup(); expect(s.read().tables).toEqual([]);
    expect(s.apply([{type: "table.save", id: "customers", name: "고객", fields: [field]}, {type: "action.save", action: {id: "invite", name: "초대", description: "이메일 초대", inputs: [field], outputs: []}}])).toMatchObject({ok: true});
    expect(s.read().tables).toHaveLength(1); expect(s.read().actions).toHaveLength(1);
    s.editor.undo(); expect(s.read().tables).toHaveLength(0); expect(s.read().actions).toHaveLength(0);
    s.editor.redo(); expect(s.read().tables).toHaveLength(1);
  });
  it("preserves edited rows on append and compatible values on schema change; regeneration is undoable", () => {
    const s = setup();
    s.apply([{type: "table.save", id: "customers", name: "고객", fields: [field]}, {type: "table.generate", id: "customers", count: 2, mode: "append"}]);
    const data = s.read().tables[0]!.data;
    expect(s.apply([{type: "table.data", id: "customers", data: {...data, records: [{...data.records[0]!, values: {name: "직접 수정"}}, data.records[1]!]}}])).toMatchObject({ok: true});
    s.apply([{type: "table.generate", id: "customers", count: 1, mode: "append"}]);
    expect(s.read().tables[0]!.data.records.map(r => r.values.name)).toEqual(["직접 수정", "예시", "예시"]);
    s.apply([{type: "table.save", id: "customers", name: "고객", fields: [field, {...field, id: "count", name: "개수", type: "number"}]}]);
    expect(s.read().tables[0]!.data.records[0]!.values).toEqual({name: "직접 수정", count: 0});
    s.editor.undo();
    s.apply([{type: "table.generate", id: "customers", count: 1, mode: "replace"}]);
    expect(s.read().tables[0]!.data.records).toHaveLength(1);
    s.editor.undo(); expect(s.read().tables[0]!.data.records[0]!.values.name).toBe("직접 수정");
  });
  it("rejects invalid batches, unknown tables and generator/type mismatches without partial commits", () => {
    const s = setup(); const before = s.editor.snapshot.value;
    expect(s.apply([{type: "table.save", id: "ok", name: "유효", fields: [field]}, {type: "table.save", id: "bad", name: "오류", fields: [{...field, type: "select"}]}])).toMatchObject({ok: false});
    expect(s.editor.snapshot.value).toBe(before);
    expect(s.apply([{type: "table.generate", id: "missing", count: 10, mode: "append"}])).toMatchObject({ok: false});
    s.apply([{type: "table.save", id: "numbers", name: "숫자", fields: [{...field, type: "number"}]}]);
    expect(s.apply([{type: "table.generate", id: "numbers", count: 2, mode: "append"}])).toMatchObject({ok: false});
    expect(s.read().tables[0]!.data.records).toEqual([]);
    expect(s.apply([{type: "table.generate", id: "numbers", count: 1001, mode: "append"}])).toMatchObject({ok: false});
  });
  it("guards document replacement/restore and stale agent calls", () => {
    const s = setup();
    expect(s.editor.dispatch({type: "document.replace", document: {...s.read(), actions: [{id: "bad", name: "", description: "", inputs: [], outputs: []}]}})).toMatchObject({ok: false});
    expect(() => createUIBuilderEditor({...s.read(), tables: [{id: "bad"}]})).toThrow();
    const tools = createUIBuilderMaterialTools(s.editor, () => "예시");
    const read = tools.find(t => t.name === "read_ui_builder_materials")!;
    const save = tools.find(t => t.name === "save_ui_builder_materials")!;
    const args = {tables: [{id: "customers", name: "고객", fields: [field]}], actions: []};
    expect(save.execute(args)).toMatchObject({ok: false}); read.execute({});
    s.apply([{type: "action.save", action: {id: "invite", name: "초대", description: "", inputs: [], outputs: []}}]);
    expect(save.execute(args)).toMatchObject({ok: false}); read.execute({});
    expect(save.execute(args)).toMatchObject({ok: true});
  });
});
