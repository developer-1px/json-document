import {describe, expect, it} from "vitest";
import {createUIComponentObject, type UIComponentObject} from "@interactive-os/json-document-object-document";
import {createUIBuilderEditor, createUIBuilderTools} from "../src/ui-builder.js";
import {applyUIBuilderMaterials, readUIBuilderProject, type UIBuilderField} from "../src/ui-builder-materials.js";
import {applyUIBuilderConfiguration} from "../src/ui-builder-configuration.js";
import {resolveUIBuilderComponent} from "../src/ui-builder-bindings.js";
import {resolveUIBuilderActionPrerequisites, executeUIBuilderAction, setUIBuilderInput, type UIBuilderSkillDefinition} from "../src/ui-builder-runtime.js";
import {createUIBuilderLayoutTools} from "../src/ui-builder-layout-tools.js";
import {resolveUIBuilderCollection} from "../src/ui-builder-collections.js";
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
 it("keeps selected-record properties independent of a filtered collection", () => {
  const s=setup();const query=createUIComponentObject("search",{x:0,y:0}) as UIComponentObject;
  const detail=createUIComponentObject("detail-list",{x:0,y:60}) as UIComponentObject;
  const list=createUIComponentObject("record-list",{x:0,y:120}) as UIComponentObject;
  const connection={tableId:"tasks",fieldIds:["name"]};
  const project={...s.read(),objects:[...s.read().objects,{...query,id:"search",document:{...query.document,props:{targetTableId:"tasks",fieldId:"name"}}}]};
  const listObject={...list,document:{...list.document,collection:connection}};
  expect(resolveUIBuilderCollection(project,listObject,{tasks:"a"},{search:"다른"})?.selectionOutsideQuery).toBe(true);
  expect(resolveUIBuilderCollection(project,listObject,{tasks:"b"},{search:"다른"})?.selectionOutsideQuery).toBe(false);
  expect(resolveUIBuilderCollection(project,listObject,{tasks:""},{search:"다른"})?.selectionOutsideQuery).toBe(false);
  expect(resolveUIBuilderCollection(project,{...list,document:{...list.document,collection:connection}},{tasks:"a"},{search:"다른"})?.document.records.map(record=>record.id)).toEqual(["b"]);
  const projection=resolveUIBuilderCollection(project,{...detail,document:{...detail.document,collection:connection}},{tasks:"a"},{search:"다른"});
  expect(projection?.selectedRecordId).toBe("a");
  expect(projection?.document.records.find(record=>record.id==="a")?.values.name).toBe("첫 업무");
 });
 it("hides a composition only when all its children require a missing selection", () => {
  const s=setup();const parent=createUIComponentObject("toolbar",{x:0,y:0}) as UIComponentObject;
  const input=s.read().objects[1] as UIComponentObject;
  const bound={...input,document:{...input.document,bindings:[{target:"value" as const,mode:"value" as const,tableId:"tasks",fieldId:"name",recordId:""}]}};
  const group={...parent,id:"group",document:{...parent.document,childIds:[bound.id]}};
  const project={...s.read(),objects:[bound,group]};
  expect(resolveUIBuilderComponent(project,group,{tasks:""}).selectionMissing).toBe(true);
  expect(resolveUIBuilderComponent(project,group,{tasks:"a"}).selectionMissing).toBe(false);
  const independent={...createUIComponentObject("text",{x:0,y:0}),id:"independent"};
  expect(resolveUIBuilderComponent({...project,objects:[...project.objects,independent]}, {...group,document:{...group.document,childIds:[bound.id,independent.id]}},{tasks:""}).selectionMissing).toBe(false);
 });
 it("reads the displayed query and filtered collection for AI arrangement without persisting the query", () => {
  const s=setup();const project=s.read();
  const search=createUIComponentObject("search",{x:0,y:0}) as UIComponentObject;
  const list=createUIComponentObject("record-list",{x:0,y:60}) as UIComponentObject;
  const editor=createUIBuilderEditor({...project,objects:[...project.objects,{...search,id:"search",document:{...search.document,props:{targetTableId:"tasks",fieldId:"name"}}},{...list,id:"list",document:{...list.document,collection:{tableId:"tasks",fieldIds:["name"]}}}]});
  const before=editor.snapshot.value;
  const read=createUIBuilderLayoutTools(editor,{pageId:"page:main",selection:{tasks:"b"},runtimeValues:{search:"다른"}})[0]!.execute({});
  expect(read).toMatchObject({runtimeValues:{search:"다른"},objects:expect.arrayContaining([expect.objectContaining({id:"search",document:expect.objectContaining({value:"다른"})})]),collections:expect.arrayContaining([expect.objectContaining({objectId:"list",document:expect.objectContaining({records:[expect.objectContaining({id:"b"})]})})])});
  expect(editor.snapshot.value).toBe(before);
 });
 it("projects page navigation tabs from their displayed page without rewriting initial content", () => {
  const s=setup();const object=createUIComponentObject("tabs",{x:0,y:0}) as UIComponentObject;
  const tabs={...object,document:{...object.document,pageId:"page:second",items:["첫 페이지","둘째 페이지"],value:"첫 페이지",props:{pageIds:["page:main","page:second"]}}};
  expect(resolveUIBuilderComponent(s.read(),tabs,{}, {[tabs.id]:"첫 페이지"}).object.document.value).toBe("둘째 페이지");
  expect(tabs.document.value).toBe("첫 페이지");
 });
 it("publishes child order and root flow atomically without changing child membership", () => {
  const parent=createUIComponentObject("group",{x:20,y:30}) as UIComponentObject;
  const editor=createUIBuilderEditor({profile:"canvas/1",width:1200,height:900,objects:[{...parent,id:"parent",document:{...parent.document,childIds:["a","b"]}},{...createUIComponentObject("text",{x:20,y:40}),id:"a"},{...createUIComponentObject("text",{x:20,y:50}),id:"b"}]});
  const before=editor.snapshot.value;
  const flow={rows:[{columns:[{weight:1,items:[{objectId:"parent",size:"fill" as const}]}]}]};
  expect(applyUIBuilderConfiguration(editor,{flow,childOrders:[{objectId:"parent",slot:"childIds",objectIds:["b"]}]})).toMatchObject({ok:false});
  expect(editor.snapshot.value).toBe(before);
  expect(applyUIBuilderConfiguration(editor,{flow:{rows:[]},childOrders:[{objectId:"parent",slot:"childIds",objectIds:["b","a"]}]})).toMatchObject({ok:false});
  expect(editor.snapshot.value).toBe(before);
  const tools=createUIBuilderLayoutTools(editor);tools[0]!.execute({});
  expect(tools[1]!.execute({...flow,childOrders:[{objectId:"parent",slot:"childIds",objectIds:["b","a"]}]})).toMatchObject({ok:true});
  expect((readUIBuilderProject(editor.snapshot.value).objects[0] as UIComponentObject).document.childIds).toEqual(["b","a"]);
  editor.undo();expect(editor.snapshot.value).toEqual(before);
 });
 it("exposes nested edited geometry to arrangement while keeping only roots in top-level flow", () => {
  const parent=createUIComponentObject("group",{x:20,y:30}) as UIComponentObject;
  const child={...createUIComponentObject("text",{x:140,y:180}),id:"child"};
  const editor=createUIBuilderEditor({profile:"canvas/1",width:1200,height:900,objects:[{...parent,id:"parent",document:{...parent.document,childIds:["child"]}},child]});
  const read=createUIBuilderLayoutTools(editor)[0]!.execute({});
  expect(read).toMatchObject({ok:true,rootObjectIds:["parent"],objects:expect.arrayContaining([expect.objectContaining({id:"child",x:140,y:180})])});
  expect(read).toMatchObject({executionContract:{source:"json-document",geometryRole:"intent-sketch",publication:"responsive-flow"}});
  if(read.ok && "flow" in read) expect(read.flow.rows.flatMap(row=>row.columns.flatMap(column=>column.items.map(item=>item.objectId)))).toEqual(["parent"]);
 });
 it("reports the same required fields for command readiness and execution without running a skill", async () => {
  const s=setup();const table=s.read().tables[0]!;
  s.apply([{type:"table.data",id:table.id,data:{...table.data,records:table.data.records.map(record=>record.id==="b"?{...record,values:{...record.values,name:""}}:record)}}]);
  const readiness=resolveUIBuilderActionPrerequisites(s.read(),"run",{tasks:"b"});
  let calls=0;
  const execution=await executeUIBuilderAction(s.editor,"run",[{id:"mock",name:"Mock",description:"",run:async()=>{calls++;return {result:"unexpected"};}}],{tasks:"b"});
  expect(readiness).toMatchObject({ok:false,reason:expect.stringContaining("업무")});
  expect(execution).toEqual(readiness);expect(calls).toBe(0);
  expect(resolveUIBuilderActionPrerequisites(s.read(),"run",{tasks:"a"})).toEqual({ok:true});
 });
 it("includes nested shell slots in one subtree translation without moving unrelated objects", () => {
  const component=(kind: "product-shell" | "group" | "text", id:string, x:number, content:Record<string,unknown>={}) => {const object=createUIComponentObject(kind,{x,y:10}) as UIComponentObject;return {...object,id,document:{...object.document,...content}} as UIComponentObject;};
  const editor=createUIBuilderEditor({profile:"canvas/1",width:1200,height:900,objects:[component("product-shell","shell",10,{props:{toolbarIds:["toolbar"]}}),component("group","toolbar",20,{childIds:["leaf"]}),component("text","leaf",30),component("text","other",100)]});
  expect(editor.dispatch({type:"object.translate",objectIds:["shell","toolbar","leaf"],dx:7,dy:3})).toMatchObject({ok:true});
  expect(readUIBuilderProject(editor.snapshot.value).objects.map(object=>[object.id,object.x,object.y])).toEqual([["shell",17,13],["toolbar",27,13],["leaf",37,13],["other",100,10]]);
 });
 it("moves a composed subtree once when parent and child are selected together", () => {
  const parent=createUIComponentObject("group",{x:20,y:30});
  const child={...createUIComponentObject("text",{x:40,y:50}),id:"child"};
  const editor=createUIBuilderEditor({profile:"canvas/1",width:1200,height:900,objects:[{...parent,id:"parent",document:{...(parent as UIComponentObject).document,childIds:["child"]}},child]});
  const before=editor.snapshot.value;
  expect(editor.dispatch({type:"object.translate",objectIds:["parent","child"],dx:10,dy:20})).toMatchObject({ok:true});
  expect(readUIBuilderProject(editor.snapshot.value).objects.map(object=>[object.x,object.y])).toEqual([[30,50],[50,70]]);
  editor.undo(); expect(editor.snapshot.value).toEqual(before);
  expect(editor.dispatch({type:"object.translate",objectIds:["parent"],dx:10,dy:20})).toMatchObject({ok:true});
  expect(readUIBuilderProject(editor.snapshot.value).objects.map(object=>[object.x,object.y])).toEqual([[30,50],[50,70]]);
 });
 it("does not execute or edit a hidden first record when selection is explicitly empty", async () => {
  const s=setup();
  applyUIBuilderConfiguration(s.editor,{connections:[{objectId:"input",actionId:"",bindings:[{target:"value",mode:"value",tableId:"tasks",fieldId:"name",recordId:""}]}]});
  const before=s.editor.snapshot.value;
  let calls=0;
  expect(await executeUIBuilderAction(s.editor,"run",[{id:"mock",name:"Mock",description:"",run:async()=>{calls++;return {result:"unexpected"};}}],{tasks:""})).toMatchObject({ok:false});
  expect(setUIBuilderInput(s.editor,s.read().objects[1] as UIComponentObject,"unexpected",{tasks:""})).toMatchObject({ok:false});
  expect(calls).toBe(0);
  expect(s.editor.snapshot.value).toBe(before);
 });
 it("reads legacy visual recipes through the shared design without losing document data", () => {
  const s=setup(); const project=s.read();
  for (const designId of ["soft", "bold"]) {
   const restored=createUIBuilderEditor({...project,designId});
   expect(readUIBuilderProject(restored.snapshot.value)).toEqual({...project,designId:"clean"});
  }
 });
 it("projects live aggregates without changing geometry and reports deleted references", () => {
  const s=setup();
  expect(applyUIBuilderConfiguration(s.editor,{connections:[{objectId:"metric",actionId:"",bindings:[{target:"detail",mode:"sum",tableId:"tasks",fieldId:"cost",recordId:""}]}],designId:"clean"})).toMatchObject({ok:true});
  const stored=s.read().objects[0] as UIComponentObject;
  expect(resolveUIBuilderComponent(s.read(),stored).object.document.detail).toBe("40");
  expect(stored).toMatchObject({x:80,y:80});
  expect(stored.document.detail).toBe("12");
  s.apply([{type:"table.remove",id:"tasks"}]);
  const projection=resolveUIBuilderComponent(s.read(),stored); expect(projection.issues).toHaveLength(1);expect(projection.object.document.detail).toBe("");
  s.editor.undo(); expect(resolveUIBuilderComponent(s.read(),stored).object.document.detail).toBe("40");
  expect(readUIBuilderProject(JSON.parse(JSON.stringify(s.read()))).designId).toBe("clean");
 });
 it("rejects invalid binding batches atomically and preserves bindings through AI geometry updates", () => {
  const s=setup(); const before=s.editor.snapshot.value;
  expect(applyUIBuilderConfiguration(s.editor,{designId:"clean",connections:[{objectId:"metric",actionId:"run",bindings:[]}]})).toMatchObject({ok:false});
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
  s.apply([{type:"action.save",action:{...s.read().actions[0]!,name:"변경된 분석"}}]);
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
  const stale=createUIBuilderLayoutTools(s.editor);stale[0]!.execute({});s.apply([{type:"action.save",action:{...s.read().actions[0]!,name:"변경된 분석"}}]);
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

it("distinguishes empty current-row dependencies from fixed records and aggregate views", () => {
  const s = setup();
  const card = createUIComponentObject("card", {x: 0, y: 0}) as UIComponentObject;
  const bound = {...card, document: {...card.document, bindings: [{target: "detail" as const, tableId: "tasks", fieldId: "name", recordId: "", mode: "value" as const}]}};
  const original = JSON.stringify(bound);
  expect(resolveUIBuilderComponent(s.read(), bound, {tasks: ""}).selectionMissing).toBe(true);
  expect(resolveUIBuilderComponent(s.read(), bound, {tasks: "a"}).selectionMissing).toBe(false);
  const fixed = {...bound, document: {...bound.document, bindings: bound.document.bindings.map(binding => ({...binding, recordId: "a"}))}};
  expect(resolveUIBuilderComponent(s.read(), fixed, {tasks: ""}).selectionMissing).toBe(false);
  const count = {...bound, document: {...bound.document, bindings: bound.document.bindings.map(binding => ({...binding, mode: "count" as const}))}};
  expect(resolveUIBuilderComponent(s.read(), count, {tasks: ""}).selectionMissing).toBe(false);
  const button = {...card, document: {...card.document, component: "button" as const, actionId: "run"}};
  expect(resolveUIBuilderComponent(s.read(), button, {tasks: ""}).selectionMissing).toBe(true);
  const detail = {...card, document: {...card.document, component: "detail-list" as const, collection: {tableId: "tasks", fieldIds: ["name"]}}};
  expect(resolveUIBuilderComponent(s.read(), detail, {tasks: ""}).selectionMissing).toBe(true);
  expect(JSON.stringify(bound)).toBe(original);
});
