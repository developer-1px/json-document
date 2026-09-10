import { createJSONDocument, type JSONDocument, type JSONPatchOperation, type JSONValue } from "@interactive-os/json-document";
import { diffText } from "./text-change.js";

/** Private storage only. JSONDocument still receives ordinary JSON Patch replace operations. */
interface TextHistoryOperation {
  readonly op: "text-replace";
  readonly path: string;
  readonly from: number;
  readonly removed: string;
  readonly inserted: string;
}
export type StoredHistoryOperation = JSONPatchOperation | TextHistoryOperation;

export function storeHistoryPatch(
  forward: ReadonlyArray<JSONPatchOperation>,
  inverse: ReadonlyArray<JSONPatchOperation>,
  group: string | undefined,
): { readonly forward: ReadonlyArray<StoredHistoryOperation>; readonly inverse: ReadonlyArray<StoredHistoryOperation> } {
  const next = forward[0], previous = inverse[0];
  // Grouped/general patch sequences keep the existing inverse-patch representation.
  if (group !== undefined || forward.length !== 1 || inverse.length !== 1 || next?.op !== "replace" || previous?.op !== "replace"
    || next.path !== previous.path || typeof next.value !== "string" || typeof previous.value !== "string") return { forward, inverse };
  const before = previous.value, after = next.value;
  const change = diffText(before, after);
  if (!change || change.to - change.from + change.insert.length + 64 >= before.length + after.length) return { forward, inverse };
  const { from, to } = change;
  // A changed substring must not retain the much larger original through a sliced string.
  const removed = Array.from(before.slice(from, to)).join("");
  const inserted = Array.from(change.insert).join("");
  return {
    forward: [{ op: "text-replace", path: next.path, from, removed, inserted }],
    inverse: [{ op: "text-replace", path: next.path, from, removed: inserted, inserted: removed }],
  };
}

export function restoreHistoryPatch(document: JSONDocument, operations: ReadonlyArray<StoredHistoryOperation>): ReadonlyArray<JSONPatchOperation> | null {
  const operation = operations[0];
  if (operation?.op !== "text-replace") return operations as ReadonlyArray<JSONPatchOperation>;
  const current = document.at(operation.path);
  if (operations.length !== 1 || !current.ok || typeof current.value !== "string"
    || current.value.slice(operation.from, operation.from + operation.removed.length) !== operation.removed) return null;
  return [{
    op: "replace", path: operation.path,
    value: current.value.slice(0, operation.from) + operation.inserted + current.value.slice(operation.from + operation.removed.length),
  }];
}

/** Unrecorded writes need the original complete replacements, including their unchanged context. */
export function expandTextHistory<Entry extends { readonly forward: ReadonlyArray<StoredHistoryOperation>; readonly inverse: ReadonlyArray<StoredHistoryOperation> }>(
  value: JSONValue, stack: Entry[], direction: "forward" | "inverse",
): Entry[] | null {
  let remaining = stack.filter(entry => entry.forward[0]?.op === "text-replace").length;
  if (remaining === 0) return stack;
  const cursor = createJSONDocument(value);
  const expanded = [...stack];
  const opposite = direction === "forward" ? "inverse" : "forward";
  for (let index = stack.length - 1; index >= 0 && remaining > 0; index--) {
    const entry = stack[index]!;
    const patch = restoreHistoryPatch(cursor, entry[direction]);
    if (!patch || !cursor.commit(patch).ok) return null;
    if (entry.forward[0]?.op !== "text-replace") continue;
    const reverse = restoreHistoryPatch(cursor, entry[opposite]);
    if (!reverse) return null;
    expanded[index] = { ...entry, [direction]: patch, [opposite]: reverse };
    remaining--;
  }
  return expanded;
}
