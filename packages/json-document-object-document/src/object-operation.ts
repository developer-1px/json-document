import { applyPatch, buildPointer, jsonEqual, type JSONPatchOperation } from "@interactive-os/json-document";
import type { DocumentObject, ObjectDocument } from "./object-model.js";
import { transformObject, type ObjectTransform } from "./object-projection.js";
import { assertObjectDocument } from "./object-validation.js";

export type ObjectOperation =
  | { readonly type: "insert"; readonly objects: ReadonlyArray<DocumentObject> }
  | { readonly type: "transform"; readonly objectIds: ReadonlyArray<string>; readonly transform: ObjectTransform }
  | { readonly type: "fill"; readonly objectIds: ReadonlyArray<string>; readonly color: string }
  | { readonly type: "remove"; readonly objectIds: ReadonlyArray<string> }
  | { readonly type: "text"; readonly objectId: string; readonly text: string }
  | { readonly type: "replace"; readonly document: ObjectDocument };

export type ObjectOperationPlan =
  | { readonly ok: true; readonly operations: ReadonlyArray<JSONPatchOperation> }
  | { readonly ok: false; readonly code: string; readonly reason?: string };

/** Pure, atomic semantic planner. No selection, identity allocation, history or input lifecycle. */
export function planObjectOperation(document: ObjectDocument, operation: ObjectOperation): ObjectOperationPlan {
  try {
    assertObjectDocument(document);
    const objects = document.objects;
    const operations: JSONPatchOperation[] = [];
    if (operation.type === "replace") {
      assertObjectDocument(operation.document);
      if (!jsonEqual(document, operation.document)) operations.push({ op: "replace", path: "", value: operation.document });
    } else if (operation.type === "insert") {
      operation.objects.forEach((object, index) => operations.push({ op: "add", path: `/objects/${objects.length + index}`, value: object }));
    } else {
      const ids = operation.type === "text" ? [operation.objectId] : operation.objectIds;
      const targets = new Set(ids);
      if (ids.some((id) => !objects.some((object) => object.id === id))) return { ok: false, code: "selection.object-not-found" };
      for (let index = objects.length - 1; index >= 0; index--) {
        const object = objects[index]!;
        if (!targets.has(object.id)) continue;
        if (operation.type === "remove") {
          operations.push({ op: "remove", path: buildPointer(["objects", index]) });
        } else if (operation.type === "transform") {
          const next = transformObject(object, operation.transform);
          for (const key of ["x", "y", "width", "height"] as const) {
            if (next[key] !== object[key]) operations.push({ op: "replace", path: buildPointer(["objects", index, key]), value: next[key] });
          }
        } else if (operation.type === "fill") {
          if (operation.color !== object.color) operations.push({ op: "replace", path: buildPointer(["objects", index, "color"]), value: operation.color });
        } else if (operation.type === "text") {
          if (object.kind !== "text") return { ok: false, code: "object.not-text" };
          if (operation.text !== object.label) operations.push({ op: "replace", path: buildPointer(["objects", index, "label"]), value: operation.text });
        }
      }
    }
    const result = applyPatch(document, operations);
    if (!result.ok) return result;
    assertObjectDocument(result.value);
    return { ok: true, operations };
  } catch (error) {
    return { ok: false, code: "object.invalid", reason: error instanceof Error ? error.message : String(error) };
  }
}
