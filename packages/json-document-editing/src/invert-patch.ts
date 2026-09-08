import {
  appendSegment,
  createJSONDocument,
  parentPointer,
  parsePointer,
  trackPointer,
  tryParsePointer,
  type JSONDocument,
  type JSONPatchOperation,
} from "@interactive-os/json-document";

/** Invert against each sequential pre-state, retaining moves when reversible. */
export function invertEditingPatch(document: JSONDocument, operations: ReadonlyArray<JSONPatchOperation>): ReadonlyArray<JSONPatchOperation> | null {
  const isolated = operations.length > 1 || operations.some((op) => op.op === "move" || op.op === "copy");
  const working = isolated ? createJSONDocument(document.value) : document;
  const inverse: JSONPatchOperation[] = [];
  for (const operation of operations) {
    if (tryParsePointer(operation.path) === null) return null;
    let step: JSONPatchOperation[] = [];
    if (operation.op === "move") {
      const source = working.at(operation.from);
      if (!source.ok) return null;
      if (operation.from === operation.path) continue;
      const from = tryParsePointer(operation.from);
      const to = tryParsePointer(operation.path);
      if (from === null || to === null) return null;
      if (to.every((part, index) => from[index] === part)) {
        const destinationParent = parentPointer(operation.path);
        const destinationContainer = destinationParent === null ? null : working.at(destinationParent);
        const previous = working.at(operation.path);
        if (!previous.ok || !working.commit([operation]).ok) return null;
        // Array ancestors insert, so remove the insertion before restoring the
        // source. A reverse move would target its own descendant and be invalid.
        // Root/object ancestors replace the entire destination container.
        step = destinationContainer?.ok && Array.isArray(destinationContainer.value)
          ? [{ op: "remove", path: operation.path }, { op: "add", path: operation.from, value: source.value }]
          : [{ op: "replace", path: operation.path, value: previous.value }];
      } else {
        if (!working.commit([{ op: "remove", path: operation.from }]).ok) return null;
        const path = insertionPath(working, operation.path);
        if (path === null) return null;
        const parent = parentPointer(path);
        const container = parent === null ? null : working.at(parent);
        const previous = working.at(path);
        if (!working.commit([{ op: "add", path, value: source.value }]).ok) return null;
        const move: JSONPatchOperation = { op: "move", from: path, path: operation.from };
        step = [move];
        if (previous.ok && container?.ok && !Array.isArray(container.value)) {
          const restoredParent = trackPointer(parent!, [move], working.value);
          if (restoredParent === null) return null;
          step.push({ op: "add", path: appendSegment(restoredParent, parsePointer(path).at(-1)!), value: previous.value });
        }
      }
    } else if (operation.op === "add" || operation.op === "copy") {
      const path = insertionPath(working, operation.path);
      if (path === null) return null;
      const parent = parentPointer(path);
      const container = parent === null ? null : working.at(parent);
      const previous = working.at(path);
      step = [previous.ok && (parent === null || (container?.ok && !Array.isArray(container.value)))
        ? { op: "replace", path, value: previous.value }
        : { op: "remove", path }];
      if (isolated && !working.commit([operation]).ok) return null;
    } else if (operation.op === "replace" || operation.op === "remove") {
      const previous = working.at(operation.path);
      if (!previous.ok) return null;
      step = [{ op: operation.op === "replace" ? "replace" : "add", path: operation.path, value: previous.value }];
      if (isolated && !working.commit([operation]).ok) return null;
    } else if (isolated && !working.commit([operation]).ok) return null;
    for (let index = step.length - 1; index >= 0; index -= 1) inverse.push(step[index]!);
  }
  return inverse.reverse();
}

function insertionPath(document: JSONDocument, path: string): string | null {
  if (!path.endsWith("/-")) return path;
  const parent = path.slice(0, -2);
  const container = document.at(parent);
  if (!container.ok) return null;
  // '-' is also a valid object property. It means append only on arrays.
  return Array.isArray(container.value) ? appendSegment(parent, container.value.length) : path;
}
