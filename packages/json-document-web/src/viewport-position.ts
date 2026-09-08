export interface WebViewportPositionElement {
  readonly style: { height: string };
  getBoundingClientRect(): { readonly top: number };
}

export interface WebViewportPositionViewport {
  readonly clientHeight: number;
  readonly scrollTop: number;
  getBoundingClientRect(): { readonly top: number };
  scrollTo(options: { readonly top: number; readonly behavior: "smooth" | "instant" }): void;
  addEventListener?(type: "wheel" | "pointerdown", listener: () => void, options?: { readonly passive?: boolean }): void;
  removeEventListener?(type: "wheel" | "pointerdown", listener: () => void): void;
}

export interface WebViewportPositionObserver {
  observe(target: object, options?: object): void;
  disconnect(): void;
}

export interface WebViewportPositionVisibilityObserver {
  observe(target: object): void;
  disconnect(): void;
}

export interface WebViewportPositionOptions<Key> {
  readonly viewport: WebViewportPositionViewport;
  readonly content?: object;
  readonly findTarget: (key: Key) => WebViewportPositionElement | null;
  readonly findTailReserve?: (key: Key) => WebViewportPositionElement | null;
  readonly createResizeObserver?: (callback: () => void) => WebViewportPositionObserver;
  readonly createMutationObserver?: (callback: () => void) => WebViewportPositionObserver;
  readonly createVisibilityObserver?: (
    callback: (visible: boolean) => void,
    root: object,
  ) => WebViewportPositionVisibilityObserver;
  readonly requestFrame?: (callback: () => void) => number;
  readonly cancelFrame?: (handle: number) => void;
}

export interface WebViewportPositionPorts<Key> {
  measure(key: Key): { targetOffset: number; tailReserveOffset: number; viewportHeight: number } | null;
  setTailReserve(key: Key, height: number): boolean;
  scrollTo(top: number, behavior: "smooth" | "instant"): void;
  scheduleFrame(callback: () => void): () => void;
  observeLayout(callback: () => void): () => void;
  observeTargetVisibility(key: Key, callback: (visible: boolean) => void): () => void;
  observeUserInteraction(callback: () => void): () => void;
}

/** Adapts target positioning and temporary trailing scroll range to browser DOM lifecycles. */
export function createWebViewportPositionPorts<Key>(
  options: WebViewportPositionOptions<Key>,
): WebViewportPositionPorts<Key> {
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const cancelFrame = options.cancelFrame ?? cancelAnimationFrame;

  return {
    measure(key) {
      const target = options.findTarget(key);
      const tailReserve = options.findTailReserve?.(key) ?? null;
      if (target === null) return null;
      const viewportTop = options.viewport.getBoundingClientRect().top;
      return {
        targetOffset: target.getBoundingClientRect().top - viewportTop + options.viewport.scrollTop,
        tailReserveOffset: tailReserve === null
          ? Number.POSITIVE_INFINITY
          : tailReserve.getBoundingClientRect().top - viewportTop + options.viewport.scrollTop,
        viewportHeight: options.viewport.clientHeight,
      };
    },
    setTailReserve(key, height) {
      const tailReserve = options.findTailReserve?.(key) ?? null;
      if (tailReserve === null) return false;
      const next = `${Math.max(0, Math.ceil(height))}px`;
      if (tailReserve.style.height === next) return false;
      tailReserve.style.height = next;
      return true;
    },
    scrollTo(top, behavior) {
      options.viewport.scrollTo({ top: Math.max(0, top), behavior });
    },
    scheduleFrame(callback) {
      const handle = requestFrame(callback);
      return () => cancelFrame(handle);
    },
    observeLayout(callback) {
      const observers: WebViewportPositionObserver[] = [];
      if (options.createResizeObserver !== undefined) {
        const observer = options.createResizeObserver(callback);
        observer.observe(options.viewport);
        if (options.content !== undefined) observer.observe(options.content);
        observers.push(observer);
      }
      if (options.createMutationObserver !== undefined && options.content !== undefined) {
        const observer = options.createMutationObserver(callback);
        observer.observe(options.content, { childList: true, subtree: true, characterData: true });
        observers.push(observer);
      }
      return () => observers.forEach((observer) => observer.disconnect());
    },
    observeTargetVisibility(key, callback) {
      const target = options.findTarget(key);
      if (target === null || options.createVisibilityObserver === undefined) return () => undefined;
      const observer = options.createVisibilityObserver(callback, options.viewport);
      observer.observe(target);
      return () => observer.disconnect();
    },
    observeUserInteraction(callback) {
      const addEventListener = options.viewport.addEventListener?.bind(options.viewport);
      const removeEventListener = options.viewport.removeEventListener?.bind(options.viewport);
      if (addEventListener === undefined || removeEventListener === undefined) {
        return () => undefined;
      }
      addEventListener("wheel", callback, { passive: true });
      addEventListener("pointerdown", callback);
      return () => {
        removeEventListener("wheel", callback);
        removeEventListener("pointerdown", callback);
      };
    },
  };
}
