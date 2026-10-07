import {useRef, type RefObject} from "react";
import {gridPointIndex, gridRangeBounds, type SheetEditor, type SheetRange, type GridTopology} from "@interactive-os/json-document-editing";
import {extendGridFill} from "@interactive-os/json-document-affordance";
import {hitTestWebGrid} from "@interactive-os/json-document-web";
import {useInteractionHandle} from "@interactive-os/json-document-ui-primitives-react";

export function SheetFillHandle({editor,topology,range,surface,onPreview}: {
  readonly editor:SheetEditor; readonly topology:GridTopology; readonly range:SheetRange;
  readonly surface:RefObject<HTMLDivElement | null>; readonly onPreview:(range:SheetRange|null)=>void;
}) {
  const origin=useRef(range);
  const suppressClick=useRef(false);
  const binding=useInteractionHandle<HTMLButtonElement>({descriptor:{kind:"control"},onHandle(event) {
    if(event.phase === "start") origin.current=range;
    if(event.phase === "cancel") {onPreview(null);return;}
    const point=surface.current && hitTestWebGrid(surface.current,event.point);
    const index=point && gridPointIndex(topology,point);
    const bounds=gridRangeBounds(topology,origin.current);
    if(!index || !bounds) {if(event.phase === "commit") onPreview(null);return;}
    const extended=extendGridFill({rMin:bounds.rowStart,rMax:bounds.rowEnd,cMin:bounds.columnStart,cMax:bounds.columnEnd},
      {row:index.rowIndex,column:index.columnIndex},{rowCount:topology.rowIds.length,columnCount:topology.columnIds.length});
    const target={anchor:{rowId:topology.rowIds[extended.rMin]!,columnId:topology.columnIds[extended.cMin]!},focus:{rowId:topology.rowIds[extended.rMax]!,columnId:topology.columnIds[extended.cMax]!}};
    if(event.phase === "preview") onPreview(target);
    if(event.phase === "commit") {onPreview(null);suppressClick.current=event.delta.dx !== 0 || event.delta.dy !== 0;if(suppressClick.current) editor.dispatch({type:"range.fill",source:origin.current,target});}
  }});
  return <button type="button" aria-label="선택 범위 채우기" title="드래그로 범위 채우기 · 클릭하면 아래 한 행 채우기" {...binding.handleProps}
    onClick={event => {event.stopPropagation();if(suppressClick.current) {suppressClick.current=false;return;}const bounds=gridRangeBounds(topology,range);const row=bounds && topology.rowIds[bounds.rowEnd+1];if(bounds && row) editor.dispatch({type:"range.fill",source:range,target:{anchor:{rowId:topology.rowIds[bounds.rowStart]!,columnId:topology.columnIds[bounds.columnStart]!},focus:{rowId:row,columnId:topology.columnIds[bounds.columnEnd]!}}});}}
    style={{position:"absolute",right:-3,bottom:-3,width:7,height:7,padding:0,border:0,background:"var(--accent, #9f4937)",cursor:binding.cursor,zIndex:1}} />;
}
