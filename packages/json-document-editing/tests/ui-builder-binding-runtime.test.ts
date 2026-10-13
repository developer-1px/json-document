import {describe, expect, it} from "vitest";
import {createUIComponentObject, type UIComponentObject} from "@interactive-os/json-document-object-document";
import {createUIBuilderEditor, createUIBuilderTools} from "../src/ui-builder.js";
import {applyUIBuilderMaterials, readUIBuilderProject, type UIBuilderField} from "../src/ui-builder-materials.js";
import {applyUIBuilderConfiguration} from "../src/ui-builder-configuration.js";
import {resolveUIBuilderComponent} from "../src/ui-builder-bindings.js";
import {executeUIBuilderAction, setUIBuilderInput, type UIBuilderSkillDefinition} from "../src/ui-builder-runtime.js";
import {createUIBuilderLayoutTools} from "../src/ui-builder-layout-tools.js";
const fields: UIBuilderField[] = [
  {id: "name", name: "업무", type: "text", options: [], sample: "auto"},
  {id: "cost", name: "비용", type: "number", options: [], sample: "auto"},
  {id: "result", name: "결과", type: "text", options: [], sample: "auto"},
];
function setup() {
 const editor = createUIBuilderEditor({profile: "canvas/1", width: 1200, height: 900, objects: [{...createUIComponentObject("metric", {x: 80, y: 80}), id: "metric"}, {...createUIComponentObject("input", {x: 600, y: 80}), id: "input"}]});
 const read = () => readUIBuilderProject(editor.snapshot.value);
 const apply = (commands: Parameters<typeof applyUIBuilderMaterials>[1]) => applyUIBuilderMaterials(editor, commands);
 apply([{type: "table.save", id: "tasks", name: "업무", fields}, {type: "action.save", action: {id: "run", name: "분석", description: "", inputs: [], outputs: [], execution: {skill: "mock", tableId: "tasks", prompt: "분석", inputFieldIds: ["name"], outputFieldIds: ["result"], requiredFieldIds: ["name"]}}}]);
 const data = read().tables[0]!.data;
 apply([{type: "table.data", id: "tasks", data: {...data, records: [{id: "a", values: {name: "첫 업무", cost: 10, result: ""}}, {id: "b", values: {name: "다른 업무", cost: 30, result: ""}}]}}]);
 return {editor, read, apply};
}
describe("live builder bindings and runtime", () => {
 it("projects live aggregates without changing geometry and reports deleted references", () => {
  const s=setup();
  expect(applyUIBuilderConfiguration(s.editor,{connections:[{objectId:"metric",actionId:"",bindings:[{target:"detail",mode:"sum",tableId:"tasks",fieldId:"cost",recordId:""}]}],designId:"soft"})).toMatchObject({ok:true});
  const stored=s.read().objects[0] as UIComponentObject;
  expect(resolveUIBuilderComponent(s.read(),stored).object.document.detail).toBe("40");
  expect(stored).toMatchObject({x:80,y:80});
  expect(stored.document.detail).toBe("12");
  s.apply([{type:"table.remove",id:"tasks"}]);
  const projection=resolveUIBuilderComponent(s.read(),stored); expect(projection.issues).toHaveLength(1);expect(projection.object.document.detail).toBe("");
  s.editor.undo(); expect(resolveUIBuilderComponent(s.read(),stored).object.document.detail).toBe("40");
  expect(readUIBuilderProject(JSON.parse(JSON.stringify(s.read()))).designId).toBe("soft");
 });
 it("rejects invalid binding batches atomically and preserves bindings through AI geometry updates", () => {
  const s=setup(); const before=s.editor.snapshot.value;
  expect(applyUIBuilderConfiguration(s.editor,{designId:"bold",connections:[{objectId:"metric",actionId:"run",bindings:[]}]})).toMatchObject({ok:false});
  expect(s.editor.snapshot.value).toBe(before);
  applyUIBuilderConfiguration(s.editor,{connections:[{objectId:"input",actionId:"",bindings:[{target:"value",mode:"value",tableId:"tasks",fieldId:"name",recordId:""}]}]});
  const tools=createUIBuilderTools(s.editor); tools[0]!.execute({});
  expect(tools[1]!.execute({components:[{id:"input",component:"input",text:"이름",detail:"",items:[],tone:"default",x:600,y:300,width:320,height:84}],removeIds:[]})).toMatchObject({ok:true});
  expect((s.read().objects[1] as UIComponentObject).document.bindings).toHaveLength(1);
  const input=s.read().objects[1] as UIComponentObject;
  expect(setUIBuilderInput(s.editor,input,"수정한 업무",{tasks:"b"})).toMatchObject({ok:true});
  expect(s.read().tables[0]!.data.records.map(r=>r.values.name)).toEqual(["첫 업무","수정한 업무"]);
  expect(resolveUIBuilderComponent(s.read(),input,{tasks:"b"}).object.document.value).toBe("수정한 업무");
 });
 it("executes selected records, validates output, cancels and rejects stale async completions", async () => {
  const s=setup();
  const skills: UIBuilderSkillDefinition[]=[{id:"mock",name:"Mock",description:"",run:async ({input})=>({result:`결과 ${input.name}`})}];
  expect(await executeUIBuilderAction(s.editor,"run",skills,{tasks:"b"})).toMatchObject({ok:true,recordId:"b"});
  expect(s.read().tables[0]!.data.records.map(r=>r.values.result)).toEqual(["","결과 다른 업무"]);
  s.editor.undo();expect(s.read().tables[0]!.data.records[1]!.values.result).toBe("");
  const before=s.editor.snapshot.value;
  expect(await executeUIBuilderAction(s.editor,"run",[{...skills[0]!,run:async()=>({result:12})}])).toMatchObject({ok:false});
  expect(await executeUIBuilderAction(s.editor,"run",skills,{}, {aborted:true})).toMatchObject({ok:false});
  expect(s.editor.snapshot.value).toBe(before);
  let finish!: (value: Record<string,string>)=>void;
  const pending=executeUIBuilderAction(s.editor,"run",[{...skills[0]!,run:()=>new Promise(resolve=>{finish=resolve;})}]);
  applyUIBuilderConfiguration(s.editor,{designId:"bold"});
  finish({result:"늦은 응답"});expect(await pending).toMatchObject({ok:false});
  expect(s.read().tables[0]!.data.records[0]!.values.result).toBe("");
 });
 it("AI apply creates flow without changing free-placement geometry, rejects missing IDs and is one undo", () => {
  const s=setup(); const tools=createUIBuilderLayoutTools(s.editor);tools[0]!.execute({});
  const before=s.editor.snapshot.value;
  expect(tools[1]!.execute({rows:[{columns:[{weight:1,items:[{objectId:"metric",size:"hug"}]}]}]})).toMatchObject({ok:false});
  expect(s.editor.snapshot.value).toBe(before);
  const flow={rows:[{columns:[{weight:1,items:[{objectId:"metric",size:"hug"},{objectId:"input",size:"fill"}]}]}]};
  expect(tools[1]!.execute(flow)).toMatchObject({ok:true});
  expect(s.read().flow).toEqual(flow);
  expect(s.read().tables).toEqual(readUIBuilderProject(before).tables);
  expect(s.read().objects).toEqual(readUIBuilderProject(before).objects);
  s.editor.undo();expect(s.editor.snapshot.value).toEqual(before);
  const stale=createUIBuilderLayoutTools(s.editor);stale[0]!.execute({});applyUIBuilderConfiguration(s.editor,{designId:"soft"});
  expect(stale[1]!.execute(flow)).toMatchObject({ok:false});
 });
});

it('count/list bindings follow data and duplication keeps references',()=>{
 const s=setup();
 applyUIBuilderConfiguration(s.editor,{connections:[{objectId:'metric',actionId:'',bindings:[{target:'detail',mode:'count',tableId:'tasks',fieldId:'',recordId:''}]}]});
 expect(resolveUIBuilderComponent(s.read(),s.read().objects[0] as UIComponentObject).object.document.detail).toBe('2');
 s.editor.dispatch({type:'object.duplicate',objectIds:['metric']});
 const duplicate=s.read().objects.at(-1) as UIComponentObject;
 expect(duplicate.document.bindings).toEqual((s.read().objects[0] as UIComponentObject).document.bindings);
 const list={...createUIComponentObject('list',{x:0,y:0}),id:'list',document:{component:'list',detail:'',tone:'default',items:[],bindings:[{target:'items',mode:'list',tableId:'tasks',fieldId:'name',recordId:''}]}} as UIComponentObject;
 expect(resolveUIBuilderComponent(s.read(),list).object.document.items).toEqual(['첫 업무','다른 업무']);
});
