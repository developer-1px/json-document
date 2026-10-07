import type { TextDOMAdapter } from "../types.js";
import { plainTextDOMAdapter } from "./plain-text.js";
import { measureTextSelection } from "./text-selection-geometry.js";

/** Paint native selection outside the editing DOM. Import text-selection.css once.
 * Returns an idempotent disposal; never changes selection, focus, input, or history.
 */
export function bindTextSelectionOverlay(root: HTMLElement, dom: TextDOMAdapter = plainTextDOMAdapter): () => void {
  const document = root.ownerDocument, window = document.defaultView!;
  const forcedColors = window.matchMedia("(forced-colors: active)");
  const layer = document.createElement("div");
  layer.setAttribute("data-text-selection-overlay", "");
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);
  let frame = 0, composing = false, disposed = false;
  const native = () => { root.removeAttribute("data-text-selection-virtual"); layer.replaceChildren(); };
  const paint = () => {
    frame = 0;
    const style = window.getComputedStyle(root);
    if (composing || document.activeElement !== root || document.hidden || !document.hasFocus()
      || forcedColors.matches || style.writingMode !== "horizontal-tb") { native(); return; }
    const geometry = measureTextSelection(root, dom);
    if (!geometry) { native(); return; }
    // Clip at every scrolling/overflow ancestor, including nested editor panels.
    let left = 0, top = 0, right = window.innerWidth, bottom = window.innerHeight;
    for (let element: HTMLElement | null = root; element; element = element.parentElement) {
      const css = window.getComputedStyle(element), bounds = element.getBoundingClientRect();
      if (element === root || /auto|scroll|hidden|clip/.test(css.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
      if (element === root || /auto|scroll|hidden|clip/.test(css.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
    }
    layer.style.left = `${left}px`; layer.style.top = `${top}px`;
    layer.style.width = `${Math.max(0, right - left)}px`; layer.style.height = `${Math.max(0, bottom - top)}px`;
    layer.style.setProperty("--text-selection-background", style.getPropertyValue("--text-selection-background") || "color-mix(in srgb, Highlight 28%, transparent)");
    layer.style.color = style.getPropertyValue("--text-selection-caret") || style.color;
    const fragments = geometry.rects.map(rect => {
      const element = document.createElement("span");
      element.setAttribute(geometry.caret ? "data-text-selection-caret" : "data-text-selection-range", "");
      element.style.left = `${rect.left - left}px`; element.style.top = `${rect.top - top}px`;
      element.style.width = `${rect.width}px`; element.style.height = `${rect.height}px`;
      return element;
    });
    layer.replaceChildren(...fragments);
    if (!root.hasAttribute("data-text-selection-virtual")) root.setAttribute("data-text-selection-virtual", "");
  };
  const schedule = () => { if (!disposed && !frame) frame = window.requestAnimationFrame(paint); };
  const startComposition = (event: Event) => { if (event.target === root) { composing = true; native(); } };
  const endComposition = (event: Event) => { if (event.target === root) { composing = false; schedule(); } };
  const blur = () => { composing = false; native(); };
  const observer = new window.MutationObserver(records => {
    if (records.some(record => record.attributeName !== "data-text-selection-virtual")) schedule();
  });
  observer.observe(root, {subtree: true, childList: true, characterData: true, attributes: true});
  const resize = new window.ResizeObserver(schedule);
  for (let element: HTMLElement | null = root; element; element = element.parentElement) resize.observe(element);
  document.addEventListener("selectionchange", schedule);
  forcedColors.addEventListener("change", schedule);
  document.addEventListener("scroll", schedule, true);
  document.addEventListener("visibilitychange", schedule);
  document.fonts?.addEventListener("loadingdone", schedule);
  window.addEventListener("resize", schedule);
  window.addEventListener("blur", blur);
  window.addEventListener("focus", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("scroll", schedule);
  root.addEventListener("focus", schedule);
  root.addEventListener("blur", blur);
  root.addEventListener("input", schedule);
  root.addEventListener("compositionstart", startComposition);
  root.addEventListener("compositionend", endComposition);
  schedule();
  return () => {
    if (disposed) return;
    disposed = true;
    window.cancelAnimationFrame(frame);
    observer.disconnect(); resize.disconnect(); native(); layer.remove();
    document.removeEventListener("selectionchange", schedule);
    forcedColors.removeEventListener("change", schedule);
    document.removeEventListener("scroll", schedule, true);
    document.removeEventListener("visibilitychange", schedule);
    document.fonts?.removeEventListener("loadingdone", schedule);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("blur", blur);
    window.removeEventListener("focus", schedule);
    window.visualViewport?.removeEventListener("resize", schedule);
    window.visualViewport?.removeEventListener("scroll", schedule);
    root.removeEventListener("focus", schedule);
    root.removeEventListener("blur", blur);
    root.removeEventListener("input", schedule);
    root.removeEventListener("compositionstart", startComposition);
    root.removeEventListener("compositionend", endComposition);
  };
}
