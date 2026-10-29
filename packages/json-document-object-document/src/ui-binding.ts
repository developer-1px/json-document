import type { JSONValue } from "@interactive-os/json-document";

export const uiBindingCatalog = [
  {id: "value", label: "한 행의 값", description: "A field from the first row, or a specific record ID."},
  {id: "list", label: "목록", description: "A field from all rows, up to 50 visible values."},
  {id: "count", label: "행 개수", description: "The total number of rows; no field required."},
  {id: "sum", label: "합계", description: "Sum a numeric field across all rows."},
] as const;
export type UIBindingMode = typeof uiBindingCatalog[number]["id"];
export type UIBindingTarget = "text" | "detail" | "items" | "value";
/** References are stable IDs, never executable expressions. Empty recordId follows the first row. */
export interface UIComponentBinding extends Record<string, JSONValue> {
  readonly target: UIBindingTarget;
  readonly mode: UIBindingMode;
  readonly tableId: string;
  readonly fieldId: string;
  readonly recordId: string;
}
export function assertUIComponentBindings(value: unknown, targets: readonly UIBindingTarget[]): asserts value is readonly UIComponentBinding[] {
  if (!Array.isArray(value) || value.length > targets.length) throw new TypeError("데이터 연결을 확인해 주세요.");
  const seen = new Set<string>();
  for (const binding of value) {
    if (!binding || typeof binding !== "object" || Array.isArray(binding)
      || Object.keys(binding).some(key => !["target", "mode", "tableId", "fieldId", "recordId"].includes(key))
      || !targets.includes(binding.target) || seen.has(binding.target)
      || !uiBindingCatalog.some(entry => entry.id === binding.mode)
      || ![binding.tableId, binding.fieldId, binding.recordId].every(v => typeof v === "string")
      || !binding.tableId || (binding.mode !== "count" && !binding.fieldId)
      || (binding.target === "items") !== (binding.mode === "list")
      || (binding.mode !== "value" && binding.recordId !== "")) throw new TypeError("컴포넌트에 맞지 않는 데이터 연결입니다.");
    seen.add(binding.target);
  }
}
