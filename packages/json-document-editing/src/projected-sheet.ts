import {dispatchSheetIntent} from "./sheet-plan.js";
import {applyPatch,jsonEqual,type JSONValue} from "@interactive-os/json-document";
import {assertSheetDocument} from "@interactive-os/json-document-sheet-document";
import {bindSheetEditing,reconcileSheetSelection,type SheetDocument,type SheetEditor,type SheetEditorOptions,type SheetSelection,type SheetAvailability} from "./sheet.js";
import type {EditingSession,EditingSnapshot} from "./session.js";

export interface ProjectedSheetSource {
  readonly snapshot: {readonly value: JSONValue;readonly canUndo: boolean;readonly canRedo: boolean};
  subscribe(listener: () => void): () => void;
  undo(): {readonly ok:boolean;readonly code?:string};
  redo(): {readonly ok:boolean;readonly code?:string};
}
export type {SheetAvailability} from "./sheet.js";
export interface ProjectedSheetOptions {
  readonly source: ProjectedSheetSource;
  /** Null means absent; a present value is validated by the canonical Sheet schema. */
  readonly read: () => unknown;
  readonly write: (value: SheetDocument) => {readonly ok:boolean;readonly code?:string};
  readonly readOnly?:()=>boolean;
  readonly sheet?: SheetEditorOptions;
  /** Formats with position-based IDs remap selection after structural edits. */
  readonly mapSelection?: (selection:SheetSelection,value:SheetDocument) => SheetSelection;
}

/** Bind the common Sheet commands directly to the parent's transaction and history. */
export function createProjectedSheetEditor(options:ProjectedSheetOptions):SheetEditor {
  const empty:SheetDocument={rows:[],columns:[]};
  let observed:JSONValue|undefined,document=empty,availability:SheetAvailability="missing",revision=0;
  let selection=reconcileSheetSelection(empty,options.sheet?.selection),initialized=false,committing=false;
  const listeners=new Set<(snapshot:EditingSnapshot<SheetSelection>)=>void>();
  let unsubscribe:(()=>void)|undefined;
  const read=()=>{
    const value=options.source.snapshot.value;
    if(observed !== value){
      observed=value;
      const candidate=options.read();
      if(candidate === null || candidate === undefined){availability="missing";document=empty;}
      else {try{assertSheetDocument(candidate);document=candidate;availability="ready";}catch{availability="invalid";document=empty;}}
      selection=reconcileSheetSelection(document,initialized ? selection:options.sheet?.selection);
      initialized=true;
    }
    if(availability === "ready" || availability === "readonly")availability=options.readOnly?.() ? "readonly":"ready";
  };
  const snapshot=():EditingSnapshot<SheetSelection>=>{read();return {value:document,selection,revision,canUndo:options.source.snapshot.canUndo,canRedo:options.source.snapshot.canRedo};};
  const publish=()=>{revision++;const next=snapshot();for(const listener of listeners)listener(next);};
  const history=(action:"undo"|"redo")=>{
    committing=true;let result:ReturnType<ProjectedSheetSource["undo"]>;
    try{result=options.source[action]();}finally{committing=false;}
    publish();return result.ok ? {ok:true as const,snapshot:snapshot()}:{ok:false as const,code:result.code ?? "history.unavailable"};
  };
  const session:EditingSession<SheetSelection>={
    get snapshot(){return snapshot();},
    apply(plan){
      read();if(availability !== "ready")return {ok:false,code:`table.${availability}`};
      const next=applyPatch(document,plan.operations);
      if(!next.ok)return {ok:false,code:"sheet.invalid-plan"};
      try{assertSheetDocument(next.value);}catch{return {ok:false,code:"sheet.invalid-document"};}
      if(jsonEqual(document,next.value)){selection=plan.selectionAfter;publish();return {ok:true,snapshot:snapshot()};}
      const pending=options.mapSelection?.(plan.selectionAfter,next.value) ?? plan.selectionAfter;
      committing=true;let result:ReturnType<ProjectedSheetOptions["write"]>;
      try{result=options.write(next.value);}finally{committing=false;}
      // A failed write leaves selection and the visible document at the parent's state.
      observed=undefined;read();
      if(result.ok)selection=reconcileSheetSelection(document,pending);
      publish();return result.ok ? {ok:true,snapshot:snapshot()}:{ok:false,code:result.code ?? "table.commit-failed"};
    },
    select(next){selection=next;publish();return snapshot();},
    reconcile(fn){read();selection=fn(selection,document);publish();return snapshot();},
    undo:()=>history("undo"),redo:()=>history("redo"),
    subscribe(listener){listeners.add(listener);unsubscribe ??= options.source.subscribe(()=>{if(!committing)publish();});return ()=>{listeners.delete(listener);if(!listeners.size){unsubscribe?.();unsubscribe=undefined;}};},
  };
  const editor=bindSheetEditing(session,options.sheet);
  return {...editor,
    get availability(){read();return availability;},
    get capabilities(){return editor.capabilities;},get structure(){return editor.structure;},get snapshot(){return snapshot();},get selectedCells(){return editor.selectedCells;},
    dispatch(intent){read();if(availability === "missing" || availability === "invalid")return {ok:false,code:`table.${availability}`};return dispatchSheetIntent(session,intent,options.sheet);},
  };
}
