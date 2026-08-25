export interface WebClientPoint {
  readonly x: number;
  readonly y: number;
}

export interface WebSVGViewport {
  readonly clientRect: { readonly left: number; readonly top: number; readonly width: number; readonly height: number };
  readonly viewBox: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

export interface WebSVGElement {
  getBoundingClientRect(): { readonly left: number; readonly top: number; readonly width: number; readonly height: number };
  readonly viewBox: { readonly baseVal: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } };
}

export function projectWebClientPointToSVG(
  point: WebClientPoint,
  viewport: WebSVGViewport,
): WebClientPoint | null {
  const { clientRect, viewBox } = viewport;
  if (clientRect.width === 0 || clientRect.height === 0) return null;
  return {
    x: viewBox.x + ((point.x - clientRect.left) / clientRect.width) * viewBox.width,
    y: viewBox.y + ((point.y - clientRect.top) / clientRect.height) * viewBox.height,
  };
}

export function webSVGViewportFromElement(svg: WebSVGElement): WebSVGViewport {
  const bounds = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  return {
    clientRect: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
    viewBox: { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height },
  };
}
