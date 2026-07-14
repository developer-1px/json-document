import {
  cloneJsonSerializable,
  cloneTrustedPlainJson,
} from "../../../foundation/json/index.js";
import type { JSONPatchOperation } from "../../../foundation/patch/index.js";
import { readAt, tryParsePointer } from "../../../foundation/pointer/index.js";

export interface OwnedJSONPatch {
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly valuesTrusted: boolean;
}

type OwnedJSONValue<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

export interface JSONStateOwnership {
  freeze<T>(value: T): T;
  freezePatchResult<T>(before: T, next: T, operations: ReadonlyArray<JSONPatchOperation>): T;
  ownParsedState<T>(value: T, clone: boolean): T;
  ownTrustedInitial<T>(value: T): T;
  ownPatch(operations: ReadonlyArray<JSONPatchOperation>, trustValues?: boolean): OwnedJSONPatch;
}

export function createJSONStateOwnership(): JSONStateOwnership {
  const owned = new WeakSet<object>();

  const freezeGraph = <T>(value: T): T => {
    if (value === null || typeof value !== "object") return value;
    const stack: object[] = [value];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (owned.has(current)) continue;
      owned.add(current);
      if (Array.isArray(current)) {
        for (let index = 0; index < current.length; index += 1) {
          const child = current[index];
          if (child !== null && typeof child === "object" && !owned.has(child)) {
            stack.push(child);
          }
        }
      } else {
        for (const key of Object.keys(current)) {
          const child = (current as Record<string, unknown>)[key];
          if (child !== null && typeof child === "object" && !owned.has(child)) {
            stack.push(child);
          }
        }
      }
      if (!Object.isFrozen(current)) Object.freeze(current);
    }
    return value;
  };
  const freeze = <T>(value: T): T => freezeGraph(value);
  const freezeFully = <T>(value: T): T => freezeGraph(value);

  const freezePathContainers = (
    value: unknown,
    pointer: string,
    sealed: WeakSet<object>,
  ): void => {
    const segments = tryParsePointer(pointer);
    if (segments === null) return;
    let current = value;
    if (current !== null && typeof current === "object" && !sealed.has(current)) {
      Object.freeze(current);
      sealed.add(current);
    }
    for (const segment of segments) {
      if (current === null || typeof current !== "object") return;
      if (Array.isArray(current)) {
        if (!/^(?:0|[1-9][0-9]*)$/.test(segment)) return;
        const index = Number(segment);
        if (index >= current.length) return;
        current = current[index];
      } else {
        if (!Object.prototype.hasOwnProperty.call(current, segment)) return;
        current = (current as Record<string, unknown>)[segment];
      }
      if (current !== null && typeof current === "object" && !sealed.has(current)) {
        Object.freeze(current);
        sealed.add(current);
      }
    }
  };

  const valueAt = (value: unknown, pointer: string): { ok: true; value: unknown } | { ok: false } => {
    const segments = tryParsePointer(pointer);
    return segments === null ? { ok: false } : readAt(value, segments);
  };

  const freezeChangedGraph = (
    before: object,
    next: object,
    operations: ReadonlyArray<JSONPatchOperation>,
  ): void => {
    const trustedSources = new WeakSet<object>();
    for (const operation of operations) {
      if (operation.op !== "move") continue;
      const source = valueAt(before, operation.from);
      if (source.ok && source.value !== null && typeof source.value === "object") {
        trustedSources.add(source.value);
      }
    }

    const stack: Array<{ current: object; base: unknown }> = [{ current: next, base: before }];
    while (stack.length > 0) {
      const { current, base } = stack.pop()!;
      if (owned.has(current)) continue;
      if (current === base || trustedSources.has(current)) {
        continue;
      }

      owned.add(current);
      let directBaseChildren: WeakSet<object> | undefined;
      const isDirectBaseChild = (child: object): boolean => {
        if (base === null || typeof base !== "object") return false;
        if (directBaseChildren === undefined) {
          directBaseChildren = new WeakSet<object>();
          if (Array.isArray(base)) {
            for (const candidate of base) {
              if (candidate !== null && typeof candidate === "object") {
                directBaseChildren.add(candidate);
              }
            }
          } else {
            for (const key of Object.keys(base)) {
              const candidate = (base as Record<string, unknown>)[key];
              if (candidate !== null && typeof candidate === "object") {
                directBaseChildren.add(candidate);
              }
            }
          }
        }
        return directBaseChildren.has(child);
      };
      const schedule = (child: unknown, baseChild: unknown): void => {
        if (child === null || typeof child !== "object" || owned.has(child)) return;
        if (child === baseChild || trustedSources.has(child) || isDirectBaseChild(child)) {
          return;
        }
        stack.push({ current: child, base: baseChild });
      };

      if (Array.isArray(current)) {
        const baseArray = Array.isArray(base) ? base : undefined;
        for (let index = 0; index < current.length; index += 1) {
          schedule(current[index], baseArray?.[index]);
        }
      } else {
        const baseRecord = base !== null && typeof base === "object" && !Array.isArray(base)
          ? base as Record<string, unknown>
          : undefined;
        for (const key of Object.keys(current)) {
          schedule(
            (current as Record<string, unknown>)[key],
            baseRecord && Object.prototype.hasOwnProperty.call(baseRecord, key)
              ? baseRecord[key]
              : undefined,
          );
        }
      }
      if (!Object.isFrozen(current)) Object.freeze(current);
    }
    owned.add(next);
  };

  const freezePatchResult = <T>(
    before: T,
    next: T,
    operations: ReadonlyArray<JSONPatchOperation>,
  ): T => {
    const mutations = operations.filter((operation) => operation.op !== "test");
    if (
      before === next
      || before === null
      || typeof before !== "object"
      || next === null
      || typeof next !== "object"
      || !owned.has(before)
      || mutations.length === 0
    ) {
      return next;
    }

    if (mutations.length > 1 && !mutations.every((operation) => operation.op === "replace")) {
      freezeChangedGraph(before, next, mutations);
      return next;
    }

    // A published/frozen base and owned patch values make unchanged subtrees
    // transitively immutable. Freeze only the COW containers on changed paths.
    // Copy creates a new subtree; a move that no longer aliases its original
    // source can also contain containers created by an earlier batch operation.
    for (const operation of mutations) {
      if (operation.op !== "copy" && operation.op !== "move") continue;
      const target = valueAt(next, operation.path);
      if (!target.ok) continue;
      if (operation.op === "copy") {
        freezeGraph(target.value);
        continue;
      }
      const source = valueAt(before, operation.from);
      if (!source.ok || source.value !== target.value) freezeGraph(target.value);
    }
    const sealed = new WeakSet<object>();
    for (const operation of mutations) {
      freezePathContainers(next, operation.path, sealed);
      if (operation.op === "move") freezePathContainers(next, operation.from, sealed);
    }
    Object.freeze(next);
    owned.add(next);
    return next;
  };

  const ownParsedState = <T>(value: T, clone: boolean): T =>
    clone ? cloneTrustedPlainJson(value) : value;

  const ownTrustedInitial = <T>(value: T): T => {
    if (value !== null && typeof value === "object" && Object.isFrozen(value)) {
      // trustedInitial의 frozen root는 transitive immutability에 대한 caller assertion이다.
      owned.add(value);
      return value;
    }
    return cloneTrustedPlainJson(value);
  };

  const ownPatchValue = (value: unknown, trustValue: boolean): OwnedJSONValue<unknown> => {
    if (value !== null && typeof value === "object" && owned.has(value)) {
      return { ok: true, value };
    }
    if (trustValue) {
      return { ok: true, value: freezeFully(cloneTrustedPlainJson(value)) };
    }
    const cloned = cloneJsonSerializable(value);
    return cloned.ok
      ? { ok: true, value: freezeFully(cloned.value) }
      : cloned;
  };

  const ownPatch = (
    operations: ReadonlyArray<JSONPatchOperation>,
    trustValues = false,
  ): OwnedJSONPatch => {
    const next = new Array<JSONPatchOperation>(operations.length);
    let valuesTrusted = true;
    for (let index = 0; index < operations.length; index += 1) {
      if (!(index in operations)) continue;
      const operation = operations[index]!;
      let ownedOperation: JSONPatchOperation;
      switch (operation.op) {
        case "add":
        case "replace":
        case "test": {
          const value = ownPatchValue(operation.value, trustValues);
          if (!value.ok) valuesTrusted = false;
          ownedOperation = {
            op: operation.op,
            path: operation.path,
            value: value.ok ? value.value : operation.value,
          };
          break;
        }
        case "remove":
          ownedOperation = { op: "remove", path: operation.path };
          break;
        case "move":
        case "copy":
          ownedOperation = { op: operation.op, from: operation.from, path: operation.path };
          break;
      }
      owned.add(ownedOperation);
      Object.freeze(ownedOperation);
      next[index] = ownedOperation;
    }
    owned.add(next);
    Object.freeze(next);
    return { operations: next, valuesTrusted };
  };

  return { freeze, freezePatchResult, ownParsedState, ownTrustedInitial, ownPatch };
}
