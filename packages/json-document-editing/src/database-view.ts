import type { DatabaseTableView } from "./database.js";

/** Create a canonical Database table projection; callers choose identity-column visibility. */
export function createDatabaseView(
  id: string,
  name: string,
  propertyIds: ReadonlyArray<string>,
  ownership: DatabaseTableView["ownership"] = "personal",
  options: { readonly hiddenPropertyIds?: readonly string[] } = {},
): DatabaseTableView {
  return {
    id,
    name,
    ownership,
    layout: "table",
    projection: {
      search: "",
      filter: { id: `${id}:root`, conjunction: "and", items: [] },
      sorts: [],
      groups: [],
      columns: propertyIds.map((propertyId) => ({ propertyId, visible: !(options.hiddenPropertyIds ?? ["id"]).includes(propertyId), width: null, pinned: null })),
    },
  };
}
