import type { JSONValue } from "@interactive-os/json-document";
import type { DatabaseProperty } from "./database.js";

export function acceptsDatabaseValue(property: DatabaseProperty, value: JSONValue): boolean {
  if (property.type === "title" || property.type === "text") return typeof value === "string";
  if (property.type === "number") return typeof value === "number";
  if (property.type === "checkbox") return typeof value === "boolean";
  return typeof value === "string" && property.options.some((option) => option.id === value);
}

export function defaultDatabaseValue(property: DatabaseProperty): JSONValue {
  if (property.type === "number") return 0;
  if (property.type === "checkbox") return false;
  if (property.type === "select") return property.options[0]?.id ?? "";
  return "";
}

export function databaseValueFromText(property: DatabaseProperty, value: string): string | number | boolean {
  if (property.type === "number") return Number(value);
  if (property.type === "checkbox") return value === "true";
  return value;
}
