import { useLayoutEffect } from "react";
import { readObjectStyle } from "@interactive-os/json-document-object-document";
import { useAnchoredFloatingPosition } from "@interactive-os/json-document-react";
import { ContextualControls, Toolbar, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import type { useCanvasHand } from "./use-canvas-hand.js";
import { CanvasStyleControls } from "./canvas-style-controls.js";

/** Content formatting shares selection commands with the Hand and contextual lifecycle with UI primitives. */
export function CanvasContentToolbar({ hand, targetId, geometryKey }: {
  readonly hand: ReturnType<typeof useCanvasHand>;
  readonly targetId: string | null;
  readonly geometryKey: string;
}) {
  const target = hand.objects.find(object => object.id === targetId);
  const selected = target !== undefined && hand.selection.keys.includes(target.id);
  const position = useAnchoredFloatingPosition<SVGRectElement, HTMLDivElement>({
    active: target !== undefined, geometryKey: `${geometryKey}:${target?.x}:${target?.y}:${target?.width}:${target?.height}`,
    policy: { type: "preferred", placement: "top", fallbacks: ["bottom"] }, offset: 8, boundaryPadding: 16,
  });
  useLayoutEffect(() => {
    const element = Array.from(hand.surface.current?.querySelectorAll<SVGRectElement>("[data-canvas-object]") ?? [])
      .find(element => element.dataset.canvasObject === targetId) ?? null;
    position.anchorRef(element);
  }, [hand.surface, targetId, position.anchorRef]);
  if (!target) return null;
  const value = readObjectStyle(hand.objects.filter(object => hand.selection.keys.includes(object.id)));
  if (Object.keys(value).length === 0) return null;
  return <ContextualControls selected={selected} editing={hand.draft?.id === target.id}
    capabilities={[{ id: "format", phases: ["selected", "editing"] }]}>
    {context => context.visible.includes("format") && <div ref={position.floatingRef} style={{ ...position.style, zIndex: 30 }} data-canvas-content-toolbar={target.id}>
      <Toolbar label="콘텐츠 서식" className={floatingSurface.control}>
        <CanvasStyleControls key={JSON.stringify(hand.selection)} value={value}
          onStyle={hand.setStyle}
          {...(target.kind === "rectangle" && target.containerLayout ? { containerLayout: target.containerLayout, onContainerLayout: layout => hand.setContainerLayout(target.id, layout) } : {})} />
      </Toolbar>
    </div>}
  </ContextualControls>;
}
