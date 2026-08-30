import { useCallback, useLayoutEffect, useState, type CSSProperties, type RefCallback, type RefObject } from "react";
import {
  computeAnchoredFloatingPosition,
  type AnchoredFloatingPosition,
  type FloatingPlacementPolicy,
} from "@interactive-os/json-document-affordance";
import { createWebAnchoredFloatingPositionPorts } from "@interactive-os/json-document-web";

export interface UseAnchoredFloatingPositionOptions {
  readonly active: boolean;
  readonly policy: FloatingPlacementPolicy;
  readonly offset?: number;
  readonly boundaryPadding?: number;
  readonly boundaryRef?: RefObject<HTMLElement | null>;
}

export interface AnchoredFloatingPositionBinding<
  Anchor extends HTMLElement = HTMLElement,
  Floating extends HTMLElement = HTMLElement,
> {
  readonly anchorRef: RefCallback<Anchor>;
  readonly floatingRef: RefCallback<Floating>;
  readonly position: AnchoredFloatingPosition | null;
  readonly style: CSSProperties;
}

/** Connects platform-independent anchored placement to Web measurement and React mount lifecycles. */
export function useAnchoredFloatingPosition<
  Anchor extends HTMLElement = HTMLElement,
  Floating extends HTMLElement = HTMLElement,
>(options: UseAnchoredFloatingPositionOptions): AnchoredFloatingPositionBinding<Anchor, Floating> {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [floating, setFloating] = useState<Floating | null>(null);
  const [position, setPosition] = useState<AnchoredFloatingPosition | null>(null);
  const anchorRef = useCallback((element: Anchor | null) => setAnchor(element), []);
  const floatingRef = useCallback((element: Floating | null) => setFloating(element), []);
  const fallbackKey = options.policy.type === "preferred" ? options.policy.fallbacks?.join("|") ?? "" : "";

  useLayoutEffect(() => {
    if (!options.active || anchor === null || floating === null) {
      setPosition(null);
      return;
    }
    const viewport = anchor.ownerDocument.defaultView;
    if (viewport === null) return;
    const ports = createWebAnchoredFloatingPositionPorts({
      viewport,
      getAnchor: () => anchor,
      getFloating: () => floating,
      ...(options.boundaryRef === undefined ? {} : { getBoundary: () => options.boundaryRef?.current ?? null }),
      ...(typeof viewport.ResizeObserver === "function"
        ? { createResizeObserver: (callback: () => void) => new viewport.ResizeObserver(callback) }
        : {}),
    });
    const update = () => {
      const geometry = ports.measure();
      if (geometry === null) return setPosition(null);
      setPosition(computeAnchoredFloatingPosition({
        anchor: geometry.anchor,
        floating: geometry.floating,
        boundary: geometry.boundary,
        policy: options.policy,
        ...(options.offset === undefined ? {} : { offset: options.offset }),
        ...(options.boundaryPadding === undefined ? {} : { boundaryPadding: options.boundaryPadding }),
      }));
    };
    update();
    return ports.observe(update);
  }, [
    anchor,
    floating,
    options.active,
    options.boundaryPadding,
    options.boundaryRef,
    options.offset,
    options.policy.placement,
    options.policy.type,
    fallbackKey,
  ]);

  return {
    anchorRef,
    floatingRef,
    position,
    style: {
      position: "fixed",
      left: position?.x ?? 0,
      top: position?.y ?? 0,
      visibility: position === null ? "hidden" : undefined,
      maxWidth: position?.availableWidth,
      maxHeight: position?.availableHeight,
    },
  };
}
