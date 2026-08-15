const SMALL_ARRAY_COPY_THRESHOLD = 32;

interface SharedArrayOverlay {
  readonly base: readonly unknown[];
  readonly replacements: ReadonlyMap<number, unknown>;
}

const overlays = new WeakMap<object, SharedArrayOverlay>();

let denseCopies = 0;

export function resetDenseArrayCopies(): void {
  denseCopies = 0;
}

export function denseArrayCopies(): number {
  return denseCopies;
}

export function replaceArrayIndex(
  array: readonly unknown[],
  index: number,
  value: unknown,
): unknown[] {
  if (index < 0 || index >= array.length) {
    return copyArrayWithIndex(array, index, value);
  }
  const overlay = overlays.get(array as object);
  const base = overlay?.base ?? array;
  if (base.length <= SMALL_ARRAY_COPY_THRESHOLD) {
    return copyArrayWithIndex(array, index, value);
  }
  const replacements = new Map(overlay?.replacements);
  replacements.set(index, value);
  return createSharedArray(base, replacements);
}

function copyArrayWithIndex(
  array: readonly unknown[],
  index: number,
  value: unknown,
): unknown[] {
  const next = snapshotArray(array);
  if (array.length > SMALL_ARRAY_COPY_THRESHOLD) denseCopies += 1;
  next[index] = value;
  return next;
}

function createSharedArray(
  base: readonly unknown[],
  replacements: ReadonlyMap<number, unknown>,
): unknown[] {
  const target: unknown[] = [];
  target.length = base.length;
  Object.freeze(target);
  const handler: ProxyHandler<unknown[]> = {
    get(_target, property) {
      if (property === "length") return base.length;
      const index = propertyIndex(property);
      if (index !== null) {
        return replacements.has(index) ? replacements.get(index) : base[index];
      }
      const current = Reflect.get(Array.prototype, property, _target);
      if (typeof current !== "function") return current;
      return function (this: unknown, ...args: unknown[]) {
        return (current as (...values: unknown[]) => unknown).apply(
          snapshotArrayFrom(base, replacements),
          args,
        );
      };
    },
    getOwnPropertyDescriptor(_target, property) {
      if (property === "length") {
        return { value: base.length, writable: false, enumerable: false, configurable: false };
      }
      const index = propertyIndex(property);
      if (index === null || index >= base.length) return undefined;
      return {
        value: replacements.has(index) ? replacements.get(index) : base[index],
        writable: false,
        enumerable: true,
        configurable: true,
      };
    },
    has(_target, property) {
      if (property === "length") return true;
      const index = propertyIndex(property);
      if (index !== null) return index < base.length;
      return property in Array.prototype;
    },
    set() {
      return false;
    },
    defineProperty() {
      return false;
    },
    deleteProperty() {
      return false;
    },
  };
  const shared = new Proxy(target, handler);
  overlays.set(shared, { base, replacements });
  return shared;
}

function snapshotArray(array: readonly unknown[]): unknown[] {
  const overlay = overlays.get(array as object);
  if (overlay === undefined) return array.slice();
  return snapshotArrayFrom(overlay.base, overlay.replacements);
}

function snapshotArrayFrom(
  base: readonly unknown[],
  replacements: ReadonlyMap<number, unknown>,
): unknown[] {
  const next = base.slice();
  for (const [index, value] of replacements) next[index] = value;
  return next;
}

function propertyIndex(property: string | symbol): number | null {
  if (typeof property !== "string") return null;
  if (property === "0") return 0;
  if (!/^[1-9][0-9]*$/.test(property)) return null;
  const index = Number(property);
  return Number.isSafeInteger(index) ? index : null;
}
