import {useRef, type RefObject} from "react";
import type {GridPoint, SheetEditor} from "@interactive-os/json-document-editing";
import {hitTestWebGrid, findWebGridCell} from "@interactive-os/json-document-web";
import {useInteractionHandle} from "@interactive-os/json-document-ui-primitives-react";
import {idlePointerInteraction, reducePressInteraction, type PointerInteractionState} from "@interactive-os/json-document-selection";

/** Sheet command composition over the canonical captured pointer lifecycle. */
export function useSheetRangeSelection(editor: SheetEditor, surface: RefObject<HTMLDivElement | null>) {
  const drag = useRef<PointerInteractionState<GridPoint>>(idlePointerInteraction());
  const pressed = useRef(false);
  const binding = useInteractionHandle<HTMLElement>({descriptor:{kind:"control"}, captureTarget(input) {
    const point = surface.current && hitTestWebGrid(surface.current,{x:input.clientX,y:input.clientY});
    return point ? findWebGridCell<HTMLElement>(surface.current, point) ?? input.currentTarget : input.currentTarget;
  }, onHandle(event, input) {
    if (event.phase === "cancel") {
      const current=drag.current;
      if(current.kind === "active") drag.current=reducePressInteraction(current,{phase:"cancel",pointerId:String(input.pointerId)}).state;
      return;
    }
    const point = surface.current && hitTestWebGrid(surface.current, event.point);
    if (!point) {if(event.phase === "commit") drag.current=idlePointerInteraction();return;}
    if (event.phase === "start") {
      const operation = input.shiftKey ? "extend" : input.metaKey || input.ctrlKey ? "toggle" : "replace";
      drag.current=reducePressInteraction(idlePointerInteraction<GridPoint>(),{phase:"start",point,pointerId:String(input.pointerId),operation}).state;
      editor.dispatch({type:"selection.set",...point,mode:operation});
      findWebGridCell<HTMLElement>(surface.current, point)?.focus({preventScroll:true});
      return;
    }
    const current=drag.current;
    const result=reducePressInteraction(current,{phase:event.phase === "commit" ? "end" : "move",point,pointerId:String(input.pointerId)});
    drag.current=result.state;
    if (current.kind === "active" && current.operation !== "toggle" && (result.preview || result.commit) && (event.delta.dx !== 0 || event.delta.dy !== 0)) {
      editor.dispatch({type:"selection.set",...point,mode:"extend"});
    }
  }});
  return {...binding.handleProps,
    onPointerDown(event: Parameters<typeof binding.handleProps.onPointerDown>[0]) {
      if (event.button !== 0 || !surface.current || !hitTestWebGrid(surface.current, {x:event.clientX,y:event.clientY})) return;
      pressed.current = true;
      binding.handleProps.onPointerDown(event);
    },
    consumeClick() {const value = pressed.current; pressed.current = false; return value;},
  };
}
