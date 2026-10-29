import {describe, expect, it, vi} from "vitest";
import {createUIBuilderEditor} from "../src/ui-builder.js";
import {applyUIBuilderMaterials, readUIBuilderProject, type UIBuilderField} from "../src/ui-builder-materials.js";
import {createUIBuilderActionTools} from "../src/ui-builder-action-tools.js";
import {executeUIBuilderAction, type UIBuilderSkillDefinition} from "../src/ui-builder-runtime.js";

describe("registered builder skill capability", () => {
 it("exposes the fixed contract and rejects incompatible output wiring before save or run", async () => {
  const editor = createUIBuilderEditor({profile: "canvas/1", width: 100, height: 100, objects: []});
  const fields: UIBuilderField[] = [
   {id: "title", name: "Title", type: "text", options: [], sample: "auto"},
   {id: "state", name: "State", type: "select", options: [{id: "done", name: "Done"}], sample: "auto"},
  ];
  const execution = {skill: "mock", tableId: "tasks", prompt: "", inputFieldIds: ["title"], outputFieldIds: ["state"], requiredFieldIds: []};
  applyUIBuilderMaterials(editor, [{type: "table.save", id: "tasks", name: "Tasks", fields}, {type: "action.save", action: {id: "work", name: "Work", description: "", inputs: [], outputs: [], execution}}]);
  const table = readUIBuilderProject(editor.snapshot.value).tables[0]!;
  applyUIBuilderMaterials(editor, [{type: "table.data", id: "tasks", data: {...table.data, records: [{id: "one", values: {title: "Task", state: "done"}}]}}]);
  const run = vi.fn(async () => ({state: "Done"}));
  const skill: UIBuilderSkillDefinition = {id: "mock", name: "Mock", description: "", contract: {requiredInputFieldIds: ["title"], outputFields: [{id: "state", types: ["text"]}]}, run};
  const tools = createUIBuilderActionTools(editor, [skill]);
  expect(tools[0]!.execute({})).toMatchObject({skills: [{contract: skill.contract}]});
  const before = editor.snapshot.value;
  expect(tools[1]!.execute({actionId: "work", execution})).toMatchObject({ok: false, reason: expect.stringContaining("현재: select")});
  expect(editor.snapshot.value).toBe(before);
  expect(await executeUIBuilderAction(editor, "work", [skill])).toMatchObject({ok: false, reason: expect.stringContaining("state")});
  expect(run).not.toHaveBeenCalled();
  expect(tools[1]!.execute({actionId: "work", execution: {...execution, outputFieldIds: ["title"]}})).toMatchObject({ok: false, reason: expect.stringContaining("출력 필드는 state")});
  expect(tools[1]!.execute({actionId: "work", execution: {...execution, inputFieldIds: []}})).toMatchObject({ok: false, reason: expect.stringContaining("필요한 입력 필드 title")});
 });
});
