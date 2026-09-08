export interface WebFloatingRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WebAnchoredFloatingElement {
  getBoundingClientRect(): {
    readonly x?: number;
    readonly y?: number;
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface WebAnchoredFloatingViewport {
  readonly innerWidth: number;
  readonly innerHeight: number;
  addEventListener(type: "resize" | "scroll", listener: () => void, options?: boolean): void;
  removeEventListener(type: "resize" | "scroll", listener: () => void, options?: boolean): void;
  requestAnimationFrame(callback: () => void): number;
  cancelAnimationFrame(handle: number): void;
}

export interface WebAnchoredFloatingResizeObserver {
  observe(target: object): void;
  disconnect(): void;
}

export interface WebAnchoredFloatingGeometry {
  readonly anchor: WebFloatingRect;
  readonly floating: WebFloatingRect;
  readonly boundary: WebFloatingRect;
}

export interface WebAnchoredFloatingPositionOptions {
  readonly getAnchor: () => WebAnchoredFloatingElement | null;
  readonly getFloating: () => WebAnchoredFloatingElement | null;
  readonly getBoundary?: () => WebAnchoredFloatingElement | null;
  readonly viewport: WebAnchoredFloatingViewport;
  readonly createResizeObserver?: (callback: () => void) => WebAnchoredFloatingResizeObserver;
}

export interface WebAnchoredFloatingPositionPorts {
  measure(): WebAnchoredFloatingGeometry | null;
  observe(callback: () => void): () => void;
}

/** Measures anchored floating geometry and translates Web layout changes into recomputation requests. */
export function createWebAnchoredFloatingPositionPorts(
  options: WebAnchoredFloatingPositionOptions,
): WebAnchoredFloatingPositionPorts {
  return {
    measure() {
      const anchor = options.getAnchor();
      const floating = options.getFloating();
      if (anchor === null || floating === null) return null;
      const boundary = options.getBoundary?.() ?? null;
      return {
        anchor: webFloatingRect(anchor),
        floating: webFloatingRect(floating),
        boundary: boundary === null
          ? { x: 0, y: 0, width: options.viewport.innerWidth, height: options.viewport.innerHeight }
          : webFloatingRect(boundary),
      };
    },
    observe(callback) {
      let frame: number | null = null;
      const schedule = () => {
        if (frame !== null) return;
        frame = options.viewport.requestAnimationFrame(() => {
          frame = null;
          callback();
        });
      };
      options.viewport.addEventListener("resize", schedule);
      options.viewport.addEventListener("scroll", schedule, true);
      const observer = options.createResizeObserver?.(schedule) ?? null;
      const anchor = options.getAnchor();
      const floating = options.getFloating();
      const boundary = options.getBoundary?.() ?? null;
      if (anchor !== null) observer?.observe(anchor);
      if (floating !== null) observer?.observe(floating);
      if (boundary !== null) observer?.observe(boundary);
      return () => {
        options.viewport.removeEventListener("resize", schedule);
        options.viewport.removeEventListener("scroll", schedule, true);
        observer?.disconnect();
        if (frame !== null) options.viewport.cancelAnimationFrame(frame);
      };
    },
  };
}

function webFloatingRect(element: WebAnchoredFloatingElement | null): WebFloatingRect {
  if (element === null) return { x: 0, y: 0, width: 0, height: 0 };
  const rect = element.getBoundingClientRect();
  return {
    x: rect.x ?? rect.left,
    y: rect.y ?? rect.top,
    width: rect.width,
    height: rect.height,
  };
}
