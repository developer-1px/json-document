import type { JSONValue } from "@interactive-os/json-document";

/** Projects a canonical JSON cell value into its plain-text editing representation. */
export function jsonCellText(value: JSONValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
