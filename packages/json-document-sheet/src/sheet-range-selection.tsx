import {useRef, type RefObject} from "react";
import type {SheetEditor} from "@interactive-os/json-document-editing";
import {hitTestWebGrid, findWebGridCell,selectionOperationFromModifiers} from "@interactive-os/json-document-web";
import {useInteractionHandle} from "@interactive-os/json-document-ui-primitives-react";

/** Sheet command composition over the canonical captured pointer lifecycle. */
export function useSheetRangeSelection(editor: SheetEditor, surface: RefObject<HTMLDivElement | null>) {
  const operation = useRef<ReturnType<typeof selectionOperationFromModifiers> | null>(null);
  const pressed = useRef(false);
  const binding = useInteractionHandle<HTMLElement>({descriptor:{kind:"control"}, captureTarget(input) {
    const point = surface.current && hitTestWebGrid(surface.current,{x:input.clientX,y:input.clientY});
    return point ? findWebGridCell<HTMLElement>(surface.current, point) ?? input.currentTarget : input.currentTarget;
  }, onHandle(event, input) {
    if (event.phase === "cancel") {
      operation.current = null;
      return;
    }
    const point = surface.current && hitTestWebGrid(surface.current, event.point);
    if (!point) {if(event.phase === "commit") operation.current = null;return;}
    if (event.phase === "start") {
      operation.current = selectionOperationFromModifiers(input);
      editor.dispatch({type:"selection.set",...point,mode:operation.current});
      findWebGridCell<HTMLElement>(surface.current, point)?.focus({preventScroll:true});
      return;
    }
    const currentOperation = operation.current;
    if (event.phase === "commit") operation.current = null;
    if (currentOperation !== null && currentOperation !== "toggle" && (event.delta.dx !== 0 || event.delta.dy !== 0)) {
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
