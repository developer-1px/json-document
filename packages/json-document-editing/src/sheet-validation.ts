export {assertSheetDocument} from "@interactive-os/json-document-sheet-document";

export function assertUniqueSheetIds(ids: ReadonlyArray<string>, label: "row" | "column"): void {
  const unique = new Set<string>();
  for (const id of ids) {
    if (id.length === 0) throw new Error(`Sheet ${label} ids must not be empty.`);
    if (unique.has(id)) throw new Error(`Sheet ${label} id must be unique: ${JSON.stringify(id)}.`);
    unique.add(id);
  }
}
