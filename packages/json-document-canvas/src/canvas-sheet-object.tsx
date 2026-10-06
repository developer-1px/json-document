import {useEffect,useMemo,useRef} from "react";
import {createObjectSheetEditor,createSheetEditor,type ObjectEditor,type SheetDocument} from "@interactive-os/json-document-editing";
import type {CanvasObject} from "@interactive-os/json-document-object-document";
import {SheetHand} from "@interactive-os/json-document-sheet";
import {findWebGridCell} from "@interactive-os/json-document-web";

/** Canvas owns the spatial frame and activation; Sheet owns every cell interaction. */
export function CanvasSheetObject({object,editor,active,onDeactivate}:{
  readonly object:Extract<CanvasObject,{kind:"embedded-document"}>;
  readonly editor:ObjectEditor;
  readonly active:boolean;
  readonly onDeactivate:()=>void;
}) {
  const root=useRef<HTMLDivElement>(null);
  const persisted=(editor.snapshot.value as {objects:ReadonlyArray<{id:string}>}).objects.some(item=>item.id === object.id);
  const sheet=useMemo(()=>persisted ? createObjectSheetEditor(editor,object.id) : createSheetEditor(object.document as SheetDocument),[editor,object.id,persisted]);
  useEffect(()=>{const point=sheet.snapshot.selection.focus;if(active && point)findWebGridCell<HTMLElement>(root.current,point)?.focus({preventScroll:true});},[active,sheet]);
  return <foreignObject x={object.x} y={object.y} width={object.width} height={object.height} data-canvas-sheet={object.id}>
    <div ref={root} inert={!active} style={{width:"100%",height:"100%",overflow:"auto",background:"var(--color-background-canvas, white)",color:"var(--color-foreground-default, #222)",fontSize:13,userSelect:"text"}}>
      <SheetHand editor={sheet} label="Canvas 표" profile="spreadsheet-grid" coordinateHeaders onDeactivate={onDeactivate} onExit={onDeactivate} />
    </div>
  </foreignObject>;
}
