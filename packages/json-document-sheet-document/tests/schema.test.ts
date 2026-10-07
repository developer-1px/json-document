import {expect,test} from "vitest";
import {createSheetDocument,sheetDocumentSchema,assertSheetDocument} from "../src/index.js";

test("schema retains legacy IDs, JSON cells and extensions without adding a discriminator",()=>{
 const legacy={name:"기존 표",columns:[{id:"c0",label:"A",width:120}],rows:[{id:"r0",height:32,cells:{c0:{nested:[null,0,false]}}}]};
 expect(sheetDocumentSchema.parse(legacy)).toEqual(legacy);expect(()=>assertSheetDocument(legacy)).not.toThrow();
 const created=createSheetDocument({rows:2,columns:3});expect(sheetDocumentSchema.safeParse(created).success).toBe(true);
 expect(created.rows[0]!.cells).not.toBe(created.rows[1]!.cells);
});
test.each([
 {columns:[{id:"a",label:"A"},{id:"a",label:"B"}],rows:[]},
 {columns:[{id:"a",label:"A"}],rows:[{id:"r",cells:{}}]},
 {columns:[{id:"a",label:"A",width:0}],rows:[]},
 {columns:[],rows:[{id:"r",cells:{},height:-1}]},
 {columns:[{id:"",label:"A"}],rows:[]},
 {columns:[],rows:[{id:"r",cells:{}},{id:"r",cells:{}}]},
 {columns:[{id:"a",label:"A"}],rows:[{id:"r",cells:{a:undefined}}]},
])("rejects invalid table structures %#",value=>expect(()=>assertSheetDocument(value)).toThrow());
test("creation validates counts and sizes",()=>{
 expect(()=>createSheetDocument({rows:-1})).toThrow();expect(()=>createSheetDocument({columnWidth:NaN})).toThrow();
 expect(createSheetDocument({rows:0,columns:0})).toEqual({rows:[],columns:[]});
});

test("partial row and column schemas enforce the same size constraints as a document",async()=>{
 const {sheetRowSchema,sheetColumnSchema}=await import("../src/index.js");
 for(const size of [-1,0,NaN,Infinity,"large"]){
  const column={id:"a",label:"A",width:size},row={id:"r",cells:{a:""},height:size};
  expect(sheetColumnSchema.safeParse(column).success).toBe(false);expect(sheetDocumentSchema.safeParse({columns:[column],rows:[]}).success).toBe(false);
  expect(sheetRowSchema.safeParse(row).success).toBe(false);expect(sheetDocumentSchema.safeParse({columns:[{id:"a",label:"A"}],rows:[row]}).success).toBe(false);
 }
});
