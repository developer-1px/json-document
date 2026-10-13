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

test("async storage migrates legacy data and serializes rapid saves without writing on selection",async()=>{
 const {openWebStoredDocument}=await import("../src/stored-document.js");
 let disk:string|null=null; const writes:string[]=[];
 const storage={getItem:async()=>disk,setItem:async(_key:string,value:string)=>{await Promise.resolve();writes.push(value);disk=value;}};
 const options={key:"builder",storage,legacyStorage:()=>({getItem:()=>JSON.stringify({text:"기존 문서"})}),create:()=>source(""),restore:(v:unknown)=>source((v as {text:string}).text)};
 const doc=await openWebStoredDocument(options);expect(doc.source.snapshot.value.text).toBe("기존 문서");
 const off=doc.connect(); doc.source.edit("첫 변경");doc.source.select();doc.source.edit("마지막 변경");await doc.save();
 expect(doc.state).toBe("saved");expect(writes.map(s=>JSON.parse(s).text)).toEqual(["기존 문서","첫 변경","마지막 변경","마지막 변경"]);
 expect((await openWebStoredDocument(options)).source.snapshot.value.text).toBe("마지막 변경");off();
});
test("async load failure never overwrites the original and failed writes are observable",async()=>{
 const {openWebStoredDocument}=await import("../src/stored-document.js");
 let writes=0;
 const doc=await openWebStoredDocument({key:"builder",storage:{getItem:async()=>"broken",setItem:async()=>{writes++;throw Error("quota");}},create:()=>source(""),restore:()=>{throw Error("invalid");}});
 expect(doc.state).toBe("load-error");doc.connect();expect(writes).toBe(0);
 await doc.save();expect(doc.state).toBe("save-error");
});
