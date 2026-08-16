const objectHasOwn = Object.prototype.hasOwnProperty;

export function jsonEqual(left: unknown, right: unknown): boolean {
  if (left === undefined || right === undefined) return left === right;
  if (left === right) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  if (Array.isArray(left)) {
    const rightArray = right as ReadonlyArray<unknown>;
    if (left.length !== rightArray.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (!jsonEqual(left[index], rightArray[index])) return false;
    }
    return true;
  }
  const leftObject = left as Record<string, unknown>;
  const rightObject = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftObject);
  if (leftKeys.length !== Object.keys(rightObject).length) return false;
  return leftKeys.every((key) => objectHasOwn.call(rightObject, key)
    && jsonEqual(leftObject[key], rightObject[key]));
}
