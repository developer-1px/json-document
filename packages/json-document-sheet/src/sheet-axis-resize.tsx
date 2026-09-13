import {useRef} from "react";
import {resizeValueForKey, storedResizeValue} from "@interactive-os/json-document-affordance";
import {useInteractionHandle} from "@interactive-os/json-document-ui-primitives-react";

/** Axis presentation and command wiring; gesture lifecycle and numeric rules have canonical owners. */
export function SheetAxisResize({axis, label, onPreview, onCommit}: {
  readonly axis: "x" | "y"; readonly label: string;
  readonly onPreview: (size: number | null) => void; readonly onCommit: (size: number) => void;
}) {
  const origin = useRef(0);
  const bounds = axis === "x" ? {min:40,max:1200} : {min:24,max:1000};
  const binding = useInteractionHandle<HTMLButtonElement>({descriptor:{kind:"resize",edge:axis === "x" ? "e" : "s"},
    onHandle(event, input) {
      if (event.phase === "start") {const rect = input.currentTarget.parentElement!.getBoundingClientRect(); origin.current = axis === "x" ? rect.width : rect.height;}
      const size = storedResizeValue(origin.current + (axis === "x" ? event.delta.dx : event.delta.dy), bounds);
      if (event.phase === "preview") onPreview(size);
      if (event.phase === "cancel") onPreview(null);
      if (event.phase === "commit") {onPreview(null); if (size !== origin.current) onCommit(size);}
    }});
  return <button type="button" aria-label={label} {...binding.handleProps} onKeyDown={event => {
    const rect = event.currentTarget.parentElement!.getBoundingClientRect();
    const size = resizeValueForKey(axis === "x" ? rect.width : rect.height, event.key, event.shiftKey, axis, bounds);
    if (size !== null) {event.preventDefault();event.stopPropagation();onCommit(size);}
  }} style={{position:"absolute",padding:0,border:0,background:"transparent",cursor:binding.cursor,
    ...(axis === "x" ? {right:-3,top:0,width:6,height:"100%"} : {bottom:-3,left:0,height:6,width:"100%"})}} />;
}
