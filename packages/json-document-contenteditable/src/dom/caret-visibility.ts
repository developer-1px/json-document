interface CaretRectangle { left: number; right: number; top: number; bottom: number }

/** Reveal a measured caret through nested scrolling containers without moving the editor's selection. */
export function revealTextCaret(root: HTMLElement, rectangle: CaretRectangle): void {
  const document = root.ownerDocument, view = document.defaultView!;
  let rect = {left:rectangle.left, right:rectangle.right, top:rectangle.top, bottom:rectangle.bottom};
  const delta = (start: number, end: number, min: number, max: number) => start < min ? start - min : end > max ? end - max : 0;
  for (let element: HTMLElement | null = root; element && element !== document.scrollingElement; element = element.parentElement) {
    const style = view.getComputedStyle(element), bounds = element.getBoundingClientRect();
    const left = /auto|scroll|overlay/.test(style.overflowX) ? delta(rect.left, rect.right, bounds.left + element.clientLeft, bounds.left + element.clientLeft + element.clientWidth) : 0;
    const top = /auto|scroll|overlay/.test(style.overflowY) ? delta(rect.top, rect.bottom, bounds.top + element.clientTop, bounds.top + element.clientTop + element.clientHeight) : 0;
    if (left || top) {
      const x = element.scrollLeft, y = element.scrollTop;
      element.scrollBy({left, top, behavior:"instant"});
      rect = {left:rect.left - element.scrollLeft + x, right:rect.right - element.scrollLeft + x, top:rect.top - element.scrollTop + y, bottom:rect.bottom - element.scrollTop + y};
    }
  }
  const left = delta(rect.left, rect.right, 0, document.documentElement.clientWidth);
  const top = delta(rect.top, rect.bottom, 0, view.innerHeight);
  if (left || top) view.scrollBy({left, top, behavior:"instant"});
}
