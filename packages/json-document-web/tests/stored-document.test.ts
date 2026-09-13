import {expect,test} from "vitest";
import {createWebStoredDocument} from "../src/stored-document.js";
function source(initial: string) {
 const listeners = new Set<() => void>();
 let value = {text:initial};
 return {get snapshot(){return {value};},subscribe(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};},
  edit(text:string){value={text};for(const listener of listeners) listener();},select(){for(const listener of listeners) listener();}};
}
test("persists values, restores through the owner, skips selection, and disconnects",()=>{
 let stored:string|null=null,writes=0;
 const storage=()=>({getItem:()=>stored,setItem:(_key:string,value:string)=>{stored=value;writes++;}});
 const options={key:"sheet",storage,create:()=>source(""),restore:(value:unknown)=>source((value as {text:string}).text)};
 const first=createWebStoredDocument(options);const disconnect=first.connect();expect(writes).toBe(1);
 first.source.select();expect(writes).toBe(1);first.source.edit("한글");expect(writes).toBe(2);
 expect(createWebStoredDocument(options).source.snapshot.value.text).toBe("한글");
 disconnect();first.source.edit("detached");expect(writes).toBe(2);
});
test("preserves unreadable storage until an edit and exposes failed save/retry",()=>{
 let stored="invalid",denied=false;
 const doc=createWebStoredDocument({key:"sheet",storage:()=>({getItem:()=>stored,setItem:(_key:string,value:string)=>{if(denied)throw Error("quota");stored=value;}}),create:()=>source(""),restore:()=>{throw Error("invalid");}});
 expect(doc.state).toBe("load-error");const off=doc.connect();expect(stored).toBe("invalid");
 denied=true;doc.source.edit("recover");expect(doc.state).toBe("save-error");
 denied=false;doc.save();expect(doc.state).toBe("saved");expect(JSON.parse(stored)).toEqual({text:"recover"});off();
});
