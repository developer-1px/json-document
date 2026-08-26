import { buildPointer, type JSONPatchOperation, type JSONValue } from "@interactive-os/json-document";
import { jsonEqual } from "@interactive-os/json-document";

export function patchBetweenValues(
  before: JSONValue,
  after: JSONValue,
): ReadonlyArray<JSONPatchOperation> {
  const operations = diff(before, after, []);
  return operations.length === 0 && !jsonEqual(before, after)
    ? [{ op: "replace", path: "", value: after }]
    : operations;
}

function diff(
  before: JSONValue,
  after: JSONValue,
  segments: ReadonlyArray<string | number>,
): JSONPatchOperation[] {
  if (before === after || jsonEqual(before, after)) return [];
  if (isRecord(before) && isRecord(after)) {
    const operations: JSONPatchOperation[] = [];
    for (const key of Object.keys(after)) {
      if (!Object.prototype.hasOwnProperty.call(before, key)) {
        operations.push({ op: "add", path: buildPointer([...segments, key]), value: after[key]! });
        continue;
      }
      operations.push(...diff(before[key]!, after[key]!, [...segments, key]));
    }
    for (const key of Object.keys(before)) {
      if (Object.prototype.hasOwnProperty.call(after, key)) continue;
      operations.push({ op: "remove", path: buildPointer([...segments, key]) });
    }
    return operations;
  }
  if (Array.isArray(before) && Array.isArray(after) && before.length === after.length) {
    return before.flatMap((value, index) => diff(value, after[index]!, [...segments, index]));
  }
  return [{ op: "replace", path: buildPointer(segments), value: after }];
}

function isRecord(value: JSONValue): value is { readonly [key: string]: JSONValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
