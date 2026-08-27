export interface WebPointTargetElement {
  getBoundingClientRect(): {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
}

export interface WebPointTargetRoot<Element extends WebPointTargetElement = WebPointTargetElement> {
  querySelectorAll(selector: string): ArrayLike<Element>;
}

/**
 * Finds the first registered target whose client rectangle contains a point.
 *
 * Unlike event.target, this remains stable while another element owns pointer
 * capture, so drag surfaces can resolve the visual target under the pointer.
 */
export function findWebPointTarget<Element extends WebPointTargetElement = WebPointTargetElement>(
  selector: string,
  point: { readonly x: number; readonly y: number },
  root: WebPointTargetRoot<Element> = document,
): Element | null {
  for (const target of Array.from(root.querySelectorAll(selector))) {
    const rect = target.getBoundingClientRect();
    if (point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) {
      return target;
    }
  }
  return null;
}
