const appliedByValue = new WeakMap<object, ReadonlyArray<{ readonly op: string; readonly path: string }>>();

export function rememberAppliedOperations(
  value: object,
  applied: ReadonlyArray<{ readonly op: string; readonly path: string }>,
): void {
  appliedByValue.set(value, applied);
}

export function appliedOperationsFor(
  value: object,
): ReadonlyArray<{ readonly op: string; readonly path: string }> | null {
  return appliedByValue.get(value) ?? null;
}
