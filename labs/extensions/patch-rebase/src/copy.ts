import type {
  JSONPatchOperation,
} from "@interactive-os/json-document";

export function copyOperations(
  operations: ReadonlyArray<JSONPatchOperation>,
): JSONPatchOperation[] {
  return operations.map((operation) => cloneJson(operation));
}

export function cloneJson<T>(value: T): T {
  if (value === undefined) return undefined as T;
  return JSON.parse(JSON.stringify(value)) as T;
}
