import {
  selectionResult,
  type SelectionChange,
  type SelectionFamily,
  type SelectionResult,
} from "../core/family.js";

export type KeySelection<Key extends string = string> =
  | {
      readonly kind: "explicit";
      readonly keys: readonly Key[];
      readonly primaryKey: Key | null;
    }
  | {
      readonly kind: "all";
      readonly universe: string;
      readonly excludedKeys: readonly Key[];
      readonly primaryKey: Key | null;
    };

export type KeySelectionCommand<Key extends string = string> =
  | { readonly type: "replace"; readonly keys: readonly Key[]; readonly primaryKey?: Key }
  | { readonly type: "add"; readonly keys: readonly Key[]; readonly primaryKey?: Key }
  | { readonly type: "subtract"; readonly keys: readonly Key[] }
  | { readonly type: "toggle"; readonly keys: readonly Key[]; readonly primaryKey?: Key }
  | { readonly type: "select-all"; readonly universe: string }
  | { readonly type: "set-primary"; readonly key: Key | null }
  | { readonly type: "clear" };

export interface KeySelectionContext<Key extends string = string> {
  readonly keys: readonly Key[];
  readonly universe: string;
  readonly universeMismatch: "clear" | "retarget";
}

export interface KeySelectionMapping<Key extends string = string> {
  mapKey(key: Key): Key | null;
  mapUniverse?(universe: string): string | null;
}

export function emptyKeySelection<Key extends string = string>(): KeySelection<Key> {
  return { kind: "explicit", keys: [], primaryKey: null };
}

export function createKeySelectionFamily<Key extends string = string>(): SelectionFamily<
  KeySelection<Key>,
  KeySelectionCommand<Key>,
  KeySelectionContext<Key>,
  KeySelectionMapping<Key>,
  Key,
  SelectionChange
> {
  return {
    transition(state, command, context) {
      const current = normalizeKeySelection(state, context);
      const next = transitionKeySelection(current, command, context);
      return selectionResult(state, next, "transition", equalKeySelection);
    },
    reconcile(state, context) {
      const next = normalizeKeySelection(state, context);
      return selectionResult(state, next, "reconcile", equalKeySelection);
    },
    map(state, mapping, context) {
      const mapped = mapKeySelection(state, mapping);
      const next = normalizeKeySelection(mapped, context);
      return selectionResult(state, next, "map", equalKeySelection);
    },
    targets(state, context) {
      const normalized = normalizeKeySelection(state, context);
      if (normalized.kind === "explicit") return normalized.keys;
      const excluded = new Set(normalized.excludedKeys);
      return context.keys.filter((key) => !excluded.has(key));
    },
  };
}

export function normalizeKeySelection<Key extends string>(
  state: KeySelection<Key>,
  context: KeySelectionContext<Key>,
): KeySelection<Key> {
  const available = new Set(context.keys);
  if (state.kind === "all" && state.universe !== context.universe) {
    if (context.universeMismatch === "clear") return emptyKeySelection();
    const excludedKeys = stableKeys(state.excludedKeys, context.keys);
    const selected = context.keys.filter((key) => !excludedKeys.includes(key));
    return {
      kind: "all",
      universe: context.universe,
      excludedKeys,
      primaryKey: selected.includes(state.primaryKey as Key)
        ? state.primaryKey
        : selected[0] ?? null,
    };
  }

  if (state.kind === "explicit") {
    const keys = stableKeys(state.keys.filter((key) => available.has(key)), context.keys);
    return {
      kind: "explicit",
      keys,
      primaryKey: state.primaryKey !== null && keys.includes(state.primaryKey)
        ? state.primaryKey
        : keys.at(-1) ?? null,
    };
  }

  const excludedKeys = stableKeys(
    state.excludedKeys.filter((key) => available.has(key)),
    context.keys,
  );
  const selected = context.keys.filter((key) => !excludedKeys.includes(key));
  return {
    kind: "all",
    universe: state.universe,
    excludedKeys,
    primaryKey: state.primaryKey !== null && selected.includes(state.primaryKey)
      ? state.primaryKey
      : selected[0] ?? null,
  };
}

function transitionKeySelection<Key extends string>(
  state: KeySelection<Key>,
  command: KeySelectionCommand<Key>,
  context: KeySelectionContext<Key>,
): KeySelection<Key> {
  if (command.type === "clear") return emptyKeySelection();
  if (command.type === "select-all") {
    if (command.universe !== context.universe) return emptyKeySelection();
    return {
      kind: "all",
      universe: command.universe,
      excludedKeys: [],
      primaryKey: context.keys[0] ?? null,
    };
  }
  if (command.type === "replace") {
    const keys = stableKeys(command.keys, context.keys);
    return normalizeKeySelection({
      kind: "explicit",
      keys,
      primaryKey: command.primaryKey ?? keys.at(-1) ?? null,
    }, context);
  }
  if (command.type === "set-primary") {
    return normalizeKeySelection({ ...state, primaryKey: command.key }, context);
  }

  const candidates = stableKeys(command.keys, context.keys);
  if (state.kind === "all") {
    const excluded = new Set(state.excludedKeys);
    for (const key of candidates) {
      if (command.type === "subtract") excluded.add(key);
      if (command.type === "add") excluded.delete(key);
      if (command.type === "toggle") {
        if (excluded.has(key)) excluded.delete(key);
        else excluded.add(key);
      }
    }
    return normalizeKeySelection({
      ...state,
      excludedKeys: [...excluded],
      primaryKey: command.type === "subtract"
        ? state.primaryKey
        : command.primaryKey ?? candidates.at(-1) ?? state.primaryKey,
    }, context);
  }

  const selected = new Set(state.keys);
  for (const key of candidates) {
    if (command.type === "subtract") selected.delete(key);
    if (command.type === "add") selected.add(key);
    if (command.type === "toggle") {
      if (selected.has(key)) selected.delete(key);
      else selected.add(key);
    }
  }
  const keys = stableKeys([...selected], context.keys);
  return normalizeKeySelection({
    kind: "explicit",
    keys,
    primaryKey: command.type === "subtract"
      ? state.primaryKey
      : command.primaryKey ?? candidates.at(-1) ?? state.primaryKey,
  }, context);
}

function mapKeySelection<Key extends string>(
  state: KeySelection<Key>,
  mapping: KeySelectionMapping<Key>,
): KeySelection<Key> {
  if (state.kind === "explicit") {
    return {
      kind: "explicit",
      keys: mappedKeys(state.keys, mapping),
      primaryKey: state.primaryKey === null ? null : mapping.mapKey(state.primaryKey),
    };
  }
  return {
    kind: "all",
    universe: mapping.mapUniverse?.(state.universe) ?? state.universe,
    excludedKeys: mappedKeys(state.excludedKeys, mapping),
    primaryKey: state.primaryKey === null ? null : mapping.mapKey(state.primaryKey),
  };
}

function mappedKeys<Key extends string>(
  keys: readonly Key[],
  mapping: KeySelectionMapping<Key>,
): Key[] {
  const mapped: Key[] = [];
  for (const key of keys) {
    const next = mapping.mapKey(key);
    if (next !== null && !mapped.includes(next)) mapped.push(next);
  }
  return mapped;
}

function stableKeys<Key extends string>(keys: readonly Key[], order: readonly Key[]): Key[] {
  const candidates = new Set(keys);
  return order.filter((key) => candidates.has(key));
}

function equalKeySelection<Key extends string>(
  left: KeySelection<Key>,
  right: KeySelection<Key>,
): boolean {
  if (left.kind !== right.kind || left.primaryKey !== right.primaryKey) return false;
  if (left.kind === "explicit" && right.kind === "explicit") return equalArray(left.keys, right.keys);
  if (left.kind === "all" && right.kind === "all") {
    return left.universe === right.universe && equalArray(left.excludedKeys, right.excludedKeys);
  }
  return false;
}

function equalArray<Value>(left: readonly Value[], right: readonly Value[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
