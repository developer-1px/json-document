import {
  parentPointer,
  type JSONPatchOperation,
  type Pointer,
} from "@interactive-os/json-document";

import {
  cloneJson,
} from "./copy.js";
import {
  pointerRelation,
  readPointerValue,
} from "./pointer.js";

export function createGuards(
  state: unknown,
  operations: ReadonlyArray<JSONPatchOperation>,
  selectionAfter: Pointer | undefined,
): { ok: true; operations: JSONPatchOperation[] } | { ok: false; pointer: Pointer } {
  const paths: Pointer[] = [];
  for (const operation of operations) {
    for (const path of guardPaths(operation)) addGuardPath(paths, path);
  }
  if (
    selectionAfter !== undefined
    && !paths.some((path) => {
      const relation = pointerRelation(path, selectionAfter);
      return relation === "same" || relation === "ancestor";
    })
  ) {
    addGuardPath(paths, selectionAfter);
  }

  const guards: JSONPatchOperation[] = [];
  for (const path of paths) {
    const value = readPointerValue(state, path);
    if (!value.ok) return { ok: false, pointer: path };
    guards.push({ op: "test", path, value: cloneJson(value.value) });
  }
  return { ok: true, operations: guards };
}

function addGuardPath(paths: Pointer[], candidate: Pointer): void {
  for (let index = paths.length - 1; index >= 0; index -= 1) {
    const relation = pointerRelation(paths[index]!, candidate);
    if (relation === "same" || relation === "ancestor") return;
    if (relation === "descendant") paths.splice(index, 1);
  }
  paths.push(candidate);
}

function guardPaths(operation: JSONPatchOperation): Pointer[] {
  if (operation.op === "add") return [parentPointer(operation.path) ?? ""];
  if (operation.op === "move" || operation.op === "copy") {
    return [operation.from, parentPointer(operation.path) ?? ""];
  }
  return [operation.path];
}
