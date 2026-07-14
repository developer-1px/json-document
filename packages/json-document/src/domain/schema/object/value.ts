import { objectHasOwn } from "../../../foundation/patch/index.js";

export {
  copyRootObject as copyRootRecord,
  copyRootObjectKeyPrefix as copyRootRecordKeyPrefix,
  copyRootObjectKeys as copyRootRecordKeys,
  objectHasOwn,
  removedRootKeysMatchSuffix,
} from "../../../foundation/patch/index.js";

export function writeObjectDataValue(target: Record<string, unknown>, key: string, value: unknown): void {
  if (key === "__proto__") {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else {
    target[key] = value;
  }
}

export function createDataKeySet(keys: ReadonlyArray<string>): Record<string, true> {
  const keySet = Object.create(null) as Record<string, true>;
  for (const key of keys) keySet[key] = true;
  return keySet;
}

export function readRootRecordForLocalSchemaValidation(state: unknown):
  | { ok: true; source: Record<string, unknown>; sourceKeys: string[] }
  | { ok: false } {
  if (state === null || typeof state !== "object" || Array.isArray(state)) return { ok: false };
  const source = state as Record<string, unknown>;
  return { ok: true, source, sourceKeys: Object.keys(source) };
}
