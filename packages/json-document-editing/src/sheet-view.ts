import type {EditingPlan,EditingResult,EditingSession,EditingSnapshot} from "./session.js";
import {bindSheetEditing,reconcileSheetSelection,type SheetDocument,type SheetEditor,type SheetEditorOptions,type SheetSelection} from "./sheet.js";
import {dispatchSheetIntent} from "./sheet-plan.js";
import type {SheetColumn,SheetRow} from "@interactive-os/json-document-sheet-document";
import type {GridTopology} from "./topology.js";

/** View order is local presentation state, never a document reorder. New IDs append in document order. */
export interface SheetViewOptions {
  readonly rowOrder?:ReadonlyArray<string>;
  readonly columnOrder?:ReadonlyArray<string>;
  readonly readOnly?:()=>boolean;
  readonly selection?:SheetSelection;
}
export interface SheetGrid extends GridTopology {
  readonly rows:ReadonlyArray<SheetRow>;
  readonly columns:ReadonlyArray<SheetColumn>;
}
/** Resolve stable IDs to the current document, dropping deleted IDs and including new ones. */
export function projectSheetGrid(document:SheetDocument,order:SheetViewOptions={}):SheetGrid {
  function ordered<T extends {readonly id:string}>(items:ReadonlyArray<T>,preferred?:ReadonlyArray<string>):ReadonlyArray<T> {
    if(!preferred)return items;
    if(new Set(preferred).size !== preferred.length || preferred.some(id=>!id))throw new Error("Sheet View order requires unique nonempty IDs.");
    const remaining=new Map(items.map(item=>[item.id,item]));
    const result:T[]=[];
    for(const id of preferred){const item=remaining.get(id);if(item){result.push(item);remaining.delete(id);}}
    return [...result,...remaining.values()];
  }
  const rows=ordered(document.rows,order.rowOrder),columns=ordered(document.columns,order.columnOrder);
  return {rows,columns,rowIds:rows.map(row=>row.id),columnIds:columns.map(column=>column.id)};
}

let nextViewId=0;

/** Internal bridge: a View owns selection; its source alone owns data and History. */
export function bindSheetView(source:SheetEditor,commit:(plan:EditingPlan<SheetSelection>)=>EditingResult<SheetSelection>,options:SheetEditorOptions):SheetEditor {
  const historyScope=`sheet-view-${++nextViewId}`;
  const first=projectSheetGrid(source.snapshot.value as SheetDocument,options);
  let selection=reconcileSheetSelection({...source.snapshot.value as SheetDocument,rows:first.rows,columns:first.columns},options.selection);
  let observed=source.snapshot.value,observedRevision=source.snapshot.revision,revision=0,committing=false;
  const listeners=new Set<(snapshot:EditingSnapshot<SheetSelection>)=>void>();
  let unsubscribe:(()=>void)|undefined;
  const availability=()=>source.availability === "ready" && options.readOnly?.() ? "readonly":source.availability;
  const read=()=>{
    const next=source.snapshot;
    if(next.value !== observed || next.revision !== observedRevision)revision++;
    if(next.value !== observed){observed=next.value;selection=reconcileSheetSelection(next.value as SheetDocument,selection);}
    observedRevision=next.revision;
  };
  const snapshot=():EditingSnapshot<SheetSelection>=>{read();return {...source.snapshot,selection,revision,canUndo:availability() === "ready" && source.snapshot.canUndo,canRedo:availability() === "ready" && source.snapshot.canRedo};};
  const publish=()=>{revision++;const next=snapshot();for(const listener of listeners)listener(next);};
  const history=(action:"undo"|"redo"):EditingResult<SheetSelection>=>{
    if(source.availability !== "ready" || options.readOnly?.())return {ok:false,code:"table.readonly"};
    const result=source[action]();return result.ok ? {ok:true,snapshot:snapshot()}:result;
  };
  const session:EditingSession<SheetSelection>={
    get snapshot(){return snapshot();},
    apply(plan){
      if(source.availability !== "ready")return {ok:false,code:`table.${source.availability}`};
      committing=true;let result:EditingResult<SheetSelection>;
      try{result=commit(plan.historyGroup ? {...plan,historyGroup:`${historyScope}:${plan.historyGroup}`}:plan);}finally{committing=false;}
      if(result.ok){read();selection=reconcileSheetSelection(source.snapshot.value as SheetDocument,plan.selectionAfter);publish();return {ok:true,snapshot:snapshot()};}
      return result;
    },
    select(next){selection=next;publish();return snapshot();},
    reconcile(fn){selection=fn(selection,source.snapshot.value);publish();return snapshot();},
    undo:()=>history("undo"),redo:()=>history("redo"),
    subscribe(listener){listeners.add(listener);unsubscribe ??= source.subscribe(()=>{if(!committing)publish();});return ()=>{listeners.delete(listener);if(!listeners.size){unsubscribe?.();unsubscribe=undefined;}};},
  };
  const view=bindSheetEditing(session,options);
  return {...view,
    get availability(){return availability();},get grid(){return view.grid;},get structure(){return view.structure;},get capabilities(){return view.capabilities;},get selectedCells(){return view.selectedCells;},get snapshot(){return snapshot();},
    dispatch(intent){if(availability() !== "ready" && !intent.type.startsWith("selection."))return {ok:false,code:`table.${availability()}`};return dispatchSheetIntent(session,intent,options);},
  };
}
