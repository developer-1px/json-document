import { useLayoutEffect, type RefObject } from "react";
import { createViewportPositionSession } from "@interactive-os/json-document-affordance";
import { createWebViewportPositionPorts } from "@interactive-os/json-document-web";

export interface CalendarViewportPositionOptions {
  readonly viewportRef: RefObject<HTMLElement | null>;
  readonly active: boolean;
  readonly resetKey: string;
  readonly targetHour: number;
  readonly viewportOffset?: number;
}

/** Positions the Calendar time-grid at a product-selected hour until the user claims the viewport. */
export function useCalendarViewportPosition(options: CalendarViewportPositionOptions): void {
  useLayoutEffect(() => {
    if (!options.active) return;
    const viewport = options.viewportRef.current;
    if (viewport === null) return;
    const targetKey = String(options.targetHour).padStart(2, "0");
    const ports = createWebViewportPositionPorts<string>({
      viewport,
      findTarget: (key) => viewport.querySelector<HTMLElement>(`[data-calendar-viewport-hour="${key}"]`),
      createResizeObserver: (callback) => new ResizeObserver(callback),
    });
    const session = createViewportPositionSession<string>(ports);
    const stopLayout = ports.observeLayout(() => session.layoutChanged());
    const stopUserInteraction = ports.observeUserInteraction(() => session.cancel("user-interaction"));
    session.position(targetKey, options.viewportOffset ?? 0, "instant");
    session.complete();

    return () => {
      stopLayout();
      stopUserInteraction();
      session.cancel();
    };
  }, [options.active, options.resetKey, options.targetHour, options.viewportOffset, options.viewportRef]);
}
