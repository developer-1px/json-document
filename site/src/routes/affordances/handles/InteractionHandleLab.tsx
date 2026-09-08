import { useRef, useState } from "react";
import type { InteractionHandleEvent } from "@interactive-os/json-document-affordance";
import {
  ControlHandle,
  DragHandle,
  ResizeHandle,
} from "@interactive-os/json-document-ui-primitives-react";
import { Inspector } from "../../../shared/ui/inspector";
import { classes, ui } from "../../../shared/ui/styles";
import { interactionHandleRecipe } from "./interaction-handle-styles";

export function InteractionHandleLab() {
  const styles = interactionHandleRecipe();
  const [lastEvent, setLastEvent] = useState<InteractionHandleEvent | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dragOrigin = useRef(drag);
  const [width, setWidth] = useState(180);
  const widthOrigin = useRef(width);
  const [control, setControl] = useState({ x: 40, y: 40 });
  const controlOrigin = useRef(control);

  function handleDrag(event: InteractionHandleEvent) {
    setLastEvent(event);
    if (event.phase === "start") dragOrigin.current = drag;
    if (event.phase === "preview" || event.phase === "commit") {
      setDrag({ x: dragOrigin.current.x + event.delta.dx, y: dragOrigin.current.y + event.delta.dy });
    }
  }

  function handleControl(event: InteractionHandleEvent) {
    setLastEvent(event);
    if (event.phase === "start") controlOrigin.current = control;
    if (event.phase === "preview" || event.phase === "commit") {
      setControl({ x: controlOrigin.current.x + event.delta.dx, y: controlOrigin.current.y + event.delta.dy });
    }
  }

  return (
    <section aria-label="Interaction handle surface" className={classes("relative min-h-[24rem] overflow-hidden p-5", ui.state.focus)}>
      <p className={classes("m-0", ui.text.meta)}>Drag the grip, resize the edge, and move the control point.</p>
      <div className="relative mt-5 h-64" data-testid="interaction-handle-stage">
        <div className={styles.card()} data-testid="drag-handle-card" style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}>
          <DragHandle
            label="Move card"
            className={styles.dragHandle()}
            onHandle={handleDrag}
          >
            ⠿
          </DragHandle>
          <span className={classes("ml-7", styles.label())}>DragHandle</span>
        </div>

        <div className={styles.resizePanel()} data-testid="resize-handle-panel" style={{ width }}>
          <span className={styles.label()}>ResizeHandle</span>
          <ResizeHandle
            label="Resize panel"
            orientation="horizontal"
            className={styles.resizeHandle()}
            onHandle={(event) => {
              if (event.phase === "start") widthOrigin.current = width;
              if (event.phase === "cancel") setWidth(widthOrigin.current);
              if (event.phase === "commit" || event.phase === "cancel") setLastEvent(event);
            }}
            onResize={(delta, phase) => {
              if (phase === "preview" || phase === "commit") {
                setWidth(Math.max(120, widthOrigin.current + delta));
              }
            }}
          />
        </div>

        <div className={styles.controlPlane()} aria-label="Control point plane">
          <ControlHandle
            label="Move control point"
            className={styles.controlHandle()}
            style={{ left: control.x, top: control.y }}
            onHandle={handleControl}
          />
        </div>
      </div>
      <Inspector label="Inspect interaction handle state" items={[
        { label: "Lifecycle event", value: lastEvent, testId: "interaction-handle-event-json", size: "compact" },
      ]} />
    </section>
  );
}
