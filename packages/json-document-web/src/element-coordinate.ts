/** Converts client-pixel movement into an axis-aligned HTML element's untransformed layout units.
 * Includes CSS scale and an enclosing SVG foreignObject's viewport scale; rotation/skew are not supported.
 */
export function projectWebClientDeltaToElement(element: {
  readonly offsetWidth: number; readonly offsetHeight: number;
  getBoundingClientRect(): {readonly width: number; readonly height: number};
}, delta: {readonly dx: number; readonly dy: number}): {dx: number; dy: number} {
  const rect=element.getBoundingClientRect();
  return {dx:rect.width > 0 ? delta.dx * element.offsetWidth / rect.width : 0,
    dy:rect.height > 0 ? delta.dy * element.offsetHeight / rect.height : 0};
}
