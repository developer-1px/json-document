import {expect,test} from "vitest";
import {cellEditingAffordance,createRenameSession,gridEditingProfiles} from "../src/index.js";
test("input policy distinguishes activation from replacement and outer cancellation",()=>{
 expect(gridEditingProfiles['document-table'].enter).toBe('edit');
 expect(cellEditingAffordance({key:'Escape',shiftKey:false,metaKey:false,ctrlKey:false},{editing:false,allSelected:false}).hand).toEqual({type:'cancel'});
 expect(cellEditingAffordance({key:'a',shiftKey:false,metaKey:false,ctrlKey:false},{editing:false,allSelected:false}).hand).toMatchObject({type:'rename',initialText:'a'});
 const rename=createRenameSession({onCommit:()=>{}});rename.begin('cell','a','end');rename.update('ab');expect(rename.getSnapshot()).toEqual({key:'cell',draft:'ab',initialSelection:'end'});
});
