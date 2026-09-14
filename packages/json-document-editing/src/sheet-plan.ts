import type {EditingPlan,EditingSession,EditingSnapshot} from "./session.js";
import {bindSheetEditing,reconcileSheetSelection,type SheetDocument,type SheetSelection,type SheetIntent,type SheetEditorOptions} from "./sheet.js";
import {assertSheetDocument} from "@interactive-os/json-document-sheet-document";

export type SheetPlanResult = {readonly ok:true;readonly plan:EditingPlan<SheetSelection>} | {readonly ok:false;readonly code:string};
/** Compute a command without creating a document, recording history or notifying observers. */
export function planSheetIntent(document:SheetDocument,selection:SheetSelection,intent:SheetIntent,options:SheetEditorOptions={}):SheetPlanResult {
  assertSheetDocument(document);
  let snapshot:EditingSnapshot<SheetSelection>={value:document,selection:reconcileSheetSelection(document,selection),revision:0,canUndo:false,canRedo:false};
  let plan:EditingPlan<SheetSelection>={operations:[],selectionAfter:snapshot.selection,origin:intent.type};
  const unavailable=()=>({ok:false as const,code:"history.unavailable"});
  const session:EditingSession<SheetSelection>={
    get snapshot(){return snapshot;},
    apply(next){plan=next;return {ok:true,snapshot};},
    select(next){plan={operations:[],selectionAfter:next,origin:intent.type};snapshot={...snapshot,selection:next};return snapshot;},
    reconcile(fn){return this.select(fn(snapshot.selection,document));},
    undo:unavailable,redo:unavailable,subscribe:()=>()=>{},
  };
  const result=bindSheetEditing(session,options).dispatch(intent);
  return result.ok ? {ok:true,plan}:result;
}

/** Apply the common pure plan through a standalone or parent-owned session. */
export function dispatchSheetIntent(session:EditingSession<SheetSelection>,intent:SheetIntent,options:SheetEditorOptions={}) {
  const result=planSheetIntent(session.snapshot.value as SheetDocument,session.snapshot.selection,intent,options);
  if(!result.ok)return result;
  return result.plan.operations.length ? session.apply(result.plan):{ok:true as const,snapshot:session.select(result.plan.selectionAfter)};
}
