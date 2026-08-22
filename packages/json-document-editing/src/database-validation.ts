import type { JSONValue } from "@interactive-os/json-document";
import type { DatabaseDocument, DatabaseProperty, DatabaseTableView } from "./database.js";

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
  assertUnique(view.propertyOrder, "view property");
  if (view.propertyOrder.length !== properties.length || view.propertyOrder.some((id) => !available.has(id))) throw new Error(`Database view ${JSON.stringify(view.id)} must order every property exactly once.`);
  for (const propertyId of Object.keys(view.propertyVisibility)) if (!available.has(propertyId)) throw new Error(`Database view references unknown property ${JSON.stringify(propertyId)}.`);
  for (const [propertyId, width] of Object.entries(view.propertyWidths)) {
    if (!available.has(propertyId)) throw new Error(`Database view references unknown property ${JSON.stringify(propertyId)}.`);
    if (typeof width !== "number" || !Number.isFinite(width) || width <= 0) {
      throw new Error(`Database view ${JSON.stringify(view.id)} has an invalid width for ${JSON.stringify(propertyId)}.`);
    }
  }
  if (view.sort && !available.has(view.sort.propertyId)) throw new Error("Database sort property was not found.");
  if (view.filter && !available.has(view.filter.propertyId)) throw new Error("Database filter property was not found.");
}

export function acceptsDatabaseValue(property: DatabaseProperty, value: JSONValue): boolean {
  if (property.type === "title" || property.type === "text") return typeof value === "string";
  if (property.type === "number") return typeof value === "number";
  if (property.type === "checkbox") return typeof value === "boolean";
  return typeof value === "string" && property.options.some((option) => option.id === value);
}

function assertUnique(ids: ReadonlyArray<string>, label: string): void {
  const unique = new Set<string>();
  for (const id of ids) {
    if (id.length === 0 || unique.has(id)) throw new Error(`Database ${label} ids must be non-empty and unique.`);
    unique.add(id);
  }
}
