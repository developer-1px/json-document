export interface WebViewportElement {
  readonly clientHeight: number;
  readonly scrollHeight: number;
  getBoundingClientRect(): { readonly top: number };
  scrollBy(options: { readonly top: number; readonly behavior: "instant" }): void;
  scrollTo(options: { readonly top: number; readonly behavior: "instant" }): void;
  addEventListener(type: string, listener: () => void, options?: { readonly passive?: boolean }): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface WebViewportObserver {
  observe(target: object, options?: object): void;
  disconnect(): void;
}

export interface WebViewportInteractionOptions<Key> {
  readonly viewport: WebViewportElement;
  readonly content?: object;
  readonly findAnchor: (key: Key) => { getBoundingClientRect(): { readonly top: number } } | null;
  readonly createResizeObserver?: (callback: () => void) => WebViewportObserver;
  readonly createMutationObserver?: (callback: () => void) => WebViewportObserver;
  readonly requestFrame?: (callback: () => void) => number;
  readonly cancelFrame?: (handle: number) => void;
  readonly setTimer?: (callback: () => void, delay: number) => number;
  readonly clearTimer?: (handle: number) => void;
}

export interface WebViewportInteractionPorts<Key> {
  measureAnchor(key: Key): number | null;
  scrollBy(delta: number): void;
  scrollToFollowTarget(): void;
  scheduleFrame(callback: () => void): () => void;
  scheduleWatchdog(callback: () => void, delay: number): () => void;
  observeLayout(callback: () => void): () => void;
  observeUserScrollIntent(callback: () => void): () => void;
}

/** Adapts DOM viewport geometry and browser lifecycles without choosing product policy. */
export function createWebViewportInteractionPorts<Key>(
  options: WebViewportInteractionOptions<Key>,
): WebViewportInteractionPorts<Key> {
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const cancelFrame = options.cancelFrame ?? cancelAnimationFrame;
  const setTimer = options.setTimer ?? ((callback, delay) => window.setTimeout(callback, delay));
  const clearTimer = options.clearTimer ?? ((handle) => window.clearTimeout(handle));

  return {
    measureAnchor(key) {
      const anchor = options.findAnchor(key);
      return anchor === null
        ? null
        : anchor.getBoundingClientRect().top - options.viewport.getBoundingClientRect().top;
    },
    scrollBy(delta) {
      options.viewport.scrollBy({ top: delta, behavior: "instant" });
    },
    scrollToFollowTarget() {
      options.viewport.scrollTo({
        top: Math.max(0, options.viewport.scrollHeight - options.viewport.clientHeight),
        behavior: "instant",
      });
    },
    scheduleFrame(callback) {
      const handle = requestFrame(callback);
      return () => cancelFrame(handle);
    },
    scheduleWatchdog(callback, delay) {
      const handle = setTimer(callback, delay);
      return () => clearTimer(handle);
    },
    observeLayout(callback) {
      const observers: WebViewportObserver[] = [];
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
    observeUserScrollIntent(callback) {
      const eventTypes = ["wheel", "touchstart", "pointerdown"];
      eventTypes.forEach((type) => options.viewport.addEventListener(type, callback, { passive: true }));
      return () => eventTypes.forEach((type) => options.viewport.removeEventListener(type, callback));
    },
  };
}
