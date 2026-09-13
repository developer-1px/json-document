import type {JSONValue} from "@interactive-os/json-document";
import {createSheetEditor,type SheetDocument,type SheetEditor,type SheetEditorOptions,type SheetSelection} from "./sheet.js";

export interface ProjectedSheetSource {
  readonly snapshot: {readonly value: JSONValue;readonly canUndo: boolean;readonly canRedo: boolean};
  subscribe(listener: () => void): () => void;
  undo(): {readonly ok:boolean;readonly code?:string};
  redo(): {readonly ok:boolean;readonly code?:string};
}
export interface ProjectedSheetOptions {
  readonly source: ProjectedSheetSource;
  readonly read: () => SheetDocument | null;
  readonly write: (value: SheetDocument) => {readonly ok:boolean;readonly code?:string};
  readonly sheet?: SheetEditorOptions;
  /** Formats with position-based IDs remap selection after structural edits. */
  readonly mapSelection?: (selection:SheetSelection,value:SheetDocument) => SheetSelection;
}

/** One projection lifecycle for embedded tables. Only the parent records persisted history. */
export function createProjectedSheetEditor(options:ProjectedSheetOptions):SheetEditor {
  let observed:JSONValue|undefined,engine:SheetEditor,available=false,revision=0;
  let selection:SheetSelection|undefined;
  const listeners=new Set<Parameters<SheetEditor["subscribe"]>[0]>();
  let unsubscribe:(()=>void)|undefined;
  const read=()=>{
    const value=options.source.snapshot.value;
    if(engine && observed === value) return;
    observed=value;
    const document=options.read();available=document !== null;
    engine=createSheetEditor(document ?? {rows:[],columns:[]},{...options.sheet,selection:selection ?? engine?.snapshot.selection});
    selection=undefined;
  };
  const snapshot=()=>{read();return {...engine.snapshot,revision,canUndo:options.source.snapshot.canUndo,canRedo:options.source.snapshot.canRedo};};
  const publish=()=>{revision++;const next=snapshot();for(const listener of listeners)listener(next);};
  const commit=()=>{
    const value=engine.snapshot.value as SheetDocument;
    selection=options.mapSelection?.(engine.snapshot.selection,value) ?? engine.snapshot.selection;
    const result=options.write(value);
    if(!result.ok) selection=undefined;
    observed=undefined;publish();
    return result.ok ? {ok:true as const,snapshot:snapshot()} : {ok:false as const,code:result.code ?? "table.commit-failed"};
  };
  const history=(action:"undo"|"redo")=>{
    const result=options.source[action]();publish();
    return result.ok ? {ok:true as const,snapshot:snapshot()} : {ok:false as const,code:result.code ?? "history.unavailable"};
  };
  return {
    get capabilities(){read();return engine.capabilities;},get structure(){read();return engine.structure;},get snapshot(){return snapshot();},
    get selectedCells(){read();return engine.selectedCells;},selectedCellsIn(topology){read();return engine.selectedCellsIn(topology);},
    dispatch(intent){
      read();if(!available)return {ok:false,code:"table.unavailable"};
      const before=engine.snapshot.value,result=engine.dispatch(intent);if(!result.ok)return result;
      if(engine.snapshot.value === before){publish();return {ok:true,snapshot:snapshot()};}
      return commit();
    },
    copy(topology){read();return available ? engine.copy(topology):null;},
    cut(topology){read();if(!available)return null;const result=engine.cut(topology);return result && {clipboard:result.clipboard,result:result.result.ok ? commit():result.result};},
    undo:()=>history("undo"),redo:()=>history("redo"),
    subscribe(listener){listeners.add(listener);unsubscribe ??= options.source.subscribe(publish);return ()=>{listeners.delete(listener);if(!listeners.size){unsubscribe?.();unsubscribe=undefined;}};},
  };
}
