import type { DatabaseDocument, DatabaseFilter, DatabaseProperty, DatabaseTableView } from "./database.js";
import { acceptsDatabaseValue } from "./database-property-value.js";

export function assertDatabaseDocument(document: DatabaseDocument): void {
  assertUnique(document.schema.properties.map((property) => property.id), "property");
  assertUnique(document.records.map((record) => record.id), "record");
  assertUnique(document.views.map((view) => view.id), "view");
  for (const property of document.schema.properties) if (property.type === "select") assertUnique(property.options.map((option) => option.id), "select option");
  for (const record of document.records) for (const property of document.schema.properties) {
    if (!Object.prototype.hasOwnProperty.call(record.values, property.id)) throw new Error(`Database record ${JSON.stringify(record.id)} is missing property ${JSON.stringify(property.id)}.`);
    if (!acceptsDatabaseValue(property, record.values[property.id]!)) throw new Error(`Database record ${JSON.stringify(record.id)} has an invalid ${property.type} value.`);
  }
  for (const view of document.views) assertDatabaseView(view, document.schema.properties);
}

export function assertDatabaseView(view: DatabaseTableView, properties: ReadonlyArray<DatabaseProperty>): void {
  const available = new Set(properties.map((property) => property.id));
  const propertyIds = view.projection.columns.map((column) => column.propertyId);
  assertUnique(propertyIds, "view property");
  if (propertyIds.length !== properties.length || propertyIds.some((id) => !available.has(id))) throw new Error(`Database view ${JSON.stringify(view.id)} must project every property exactly once.`);
  for (const { propertyId, width } of view.projection.columns) {
    if (!available.has(propertyId)) throw new Error(`Database view references unknown property ${JSON.stringify(propertyId)}.`);
    if (width !== null && (!Number.isFinite(width) || width <= 0)) {
      throw new Error(`Database view ${JSON.stringify(view.id)} has an invalid width for ${JSON.stringify(propertyId)}.`);
    }
  }
  for (const sort of [...view.projection.sorts, ...view.projection.groups]) if (!available.has(sort.propertyId)) throw new Error("Database sort property was not found.");
  assertFilterProperties(view.projection.filter, available);
}

function assertFilterProperties(group: DatabaseTableView["projection"]["filter"], available: ReadonlySet<string>): void {
  for (const item of group.items) {
    if (isFilter(item)) {
      if (!available.has(item.propertyId)) throw new Error("Database filter property was not found.");
    } else assertFilterProperties(item, available);
  }
}

function isFilter(item: DatabaseTableView["projection"]["filter"]["items"][number]): item is DatabaseFilter {
  return typeof item.propertyId === "string";
}

function assertUnique(ids: ReadonlyArray<string>, label: string): void {
  const unique = new Set<string>();
  for (const id of ids) {
    if (id.length === 0 || unique.has(id)) throw new Error(`Database ${label} ids must be non-empty and unique.`);
    unique.add(id);
  }
}
