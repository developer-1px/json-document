/** Axis resize contract promoted from dogfooding-sheet; product defaults remain with its consumers. */
export interface ResizeBounds {
  min: number
  max?: number
}

const STEP = 10
const LARGE_STEP = 50

export function clampResizeValue(value: number, bounds: ResizeBounds): number {
  const finite = Number.isFinite(value) ? value : bounds.min
  const minClamped = Math.max(bounds.min, finite)
  return bounds.max === undefined ? minClamped : Math.min(bounds.max, minClamped)
}

export function storedResizeValue(value: number, bounds: ResizeBounds): number {
  return Math.round(clampResizeValue(value, bounds))
}

export function resizeValueForKey(
  current: number,
  key: string,
  shiftKey: boolean,
  axis: 'x' | 'y',
  bounds: ResizeBounds,
): number | null {
  const step = shiftKey ? LARGE_STEP : STEP
  if (key === 'PageUp') return clampResizeValue(current + LARGE_STEP, bounds)
  if (key === 'PageDown') return clampResizeValue(current - LARGE_STEP, bounds)
  if (key === 'Home') return bounds.min
  if (key === 'End') return bounds.max ?? null

  const delta =
    axis === 'x'
      ? key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : null
      : key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : null

  return delta === null ? null : clampResizeValue(current + delta, bounds)
}

export function collapseResizeValue(
  current: number,
  previous: number | null,
  bounds: ResizeBounds,
  defaultValue: number,
): { value: number; previous: number | null } {
  const normalizedCurrent = clampResizeValue(current, bounds)
  if (normalizedCurrent <= bounds.min) {
    return {
      value: clampResizeValue(previous ?? defaultValue, bounds),
      previous: null,
    }
  }
  return {
    value: bounds.min,
    previous: normalizedCurrent,
  }
}
