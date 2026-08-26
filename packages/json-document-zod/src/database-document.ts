import type { JSONValue } from "@interactive-os/json-document";
import {
  acceptsDatabaseValue,
  defaultDatabaseValue,
  type DatabaseDocument,
  type DatabaseProperty,
  type DatabasePropertyType,
  type DatabaseRecord,
  type DatabaseSelectOption,
} from "@interactive-os/json-document-editing";
import type { ZodType } from "zod/v4";

export type DatabasePropertyTypeFromZod = DatabasePropertyType;
export type DatabaseSelectOptionFromZod = DatabaseSelectOption;
export type DatabasePropertyFromZod = DatabaseProperty;
export type DatabaseRecordFromZod = DatabaseRecord;
export type DatabaseDocumentFromZod = DatabaseDocument;

export type DatabaseDocumentFromZodResult =
  | { readonly ok: true; readonly value: DatabaseDocumentFromZod }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
      readonly pointer?: string;
    };

interface ZodNode {
  readonly def: {
    readonly type: string;
    readonly innerType?: ZodNode;
    readonly entries?: Readonly<Record<string, string>>;
  };
  readonly shape?: Readonly<Record<string, ZodNode>>;
}

export function databaseDocumentFromZod(
  schema: ZodType,
  records: ReadonlyArray<unknown>,
): DatabaseDocumentFromZodResult {
  const root = schema as unknown as ZodNode;
  if (root.def.type !== "object" || root.shape === undefined) {
    return failure("not_object_schema", "Zod schema must be an object of row fields.");
  }

  const fieldEntries = Object.entries(root.shape);
  const identity = resolveIdentity(fieldEntries);
  if (!identity.ok) return identity;

  const propertyFields = fieldEntries.filter(([key]) => key !== identity.key);
  const properties: DatabasePropertyFromZod[] = [];
  let titled = false;

  for (const [key, field] of propertyFields) {
    const mapped = mapProperty(key, field, !titled);
    if (!mapped.ok) return mapped;
    if (mapped.value.type === "title") titled = true;
    properties.push(mapped.value);
  }

  if (properties.length === 0) {
    return failure("empty_schema", "Zod object must declare at least one non-id field.");
  }

  const translated: DatabaseRecordFromZod[] = [];
  const seen = new Set<string>();

  for (const [index, record] of records.entries()) {
    if (!isPlainObject(record)) {
      return failure("invalid_record", "Each record must be a JSON object.", `/${index}`);
    }

    const parsed = schema.safeParse(record);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return failure(
        "schema_violation",
        issue?.message ?? "Record failed Zod validation.",
        issue === undefined ? `/${index}` : recordPointer(index, issue.path),
      );
    }

    const recordId = identity.key === undefined
      ? { ok: true as const, value: `record-${index + 1}` }
      : readIdentity(record[identity.key], index);
    if (!recordId.ok) return recordId;
    if (seen.has(recordId.value)) {
      return failure("duplicate_id", `Duplicate record id ${JSON.stringify(recordId.value)}.`, `/${index}/${identity.key}`);
    }
    seen.add(recordId.value);

    const values: Record<string, JSONValue> = {};
    for (const property of properties) {
      const raw = record[property.id];
      const value = raw === undefined ? defaultDatabaseValue(property) : asJSONValue(raw);
      if (value === undefined || !acceptsDatabaseValue(property, value)) {
        return failure(
          "invalid_value",
          `Record ${JSON.stringify(recordId.value)} has an invalid ${property.type} value.`,
          `/${index}/${property.id}`,
        );
      }
      values[property.id] = value;
    }

    translated.push({ id: recordId.value, values });
  }

  const propertyOrder = properties.map((property) => property.id);
  return {
    ok: true,
    value: {
      schema: { properties },
      records: translated,
      views: [{
        id: "table",
        name: "All records",
        ownership: "personal",
        layout: "table",
        projection: {
          search: "",
          filter: { id: "table:root", conjunction: "and", items: [] },
          sorts: [],
          groups: [],
          columns: propertyOrder.map((propertyId) => ({ propertyId, visible: true, width: null, pinned: null })),
        },
      }],
    },
  };
}

function resolveIdentity(
  fields: ReadonlyArray<readonly [string, ZodNode]>,
):
  | { readonly ok: true; readonly key: "id" }
  | { readonly ok: true; readonly key?: undefined }
  | Extract<DatabaseDocumentFromZodResult, { readonly ok: false }> {
  const identity = fields.find(([key]) => key === "id");
  if (identity === undefined) return { ok: true };
  const unwrapped = unwrap(identity[1]);
  if (!unwrapped.ok) return unwrapped;
  if (unwrapped.value.def.type !== "string") {
    return failure("unsupported_type", "id must be a string field.", "/id");
  }
  return { ok: true, key: "id" };
}

function mapProperty(
  key: string,
  field: ZodNode,
  titleAvailable: boolean,
):
  | { readonly ok: true; readonly value: DatabasePropertyFromZod }
  | Extract<DatabaseDocumentFromZodResult, { readonly ok: false }> {
  const unwrapped = unwrap(field);
  if (!unwrapped.ok) return unwrapped;
  const type = unwrapped.value.def.type;
  if (type === "string") {
    return {
      ok: true,
      value: {
        id: key,
        name: displayName(key),
        type: titleAvailable ? "title" : "text",
        options: [],
      },
    };
  }
  if (type === "number") {
    return { ok: true, value: { id: key, name: displayName(key), type: "number", options: [] } };
  }
  if (type === "boolean") {
    return { ok: true, value: { id: key, name: displayName(key), type: "checkbox", options: [] } };
  }
  if (type === "enum") {
    const entries = unwrapped.value.def.entries ?? {};
    const options = Object.values(entries).map((id) => ({ id, name: displayName(id) }));
    if (options.length === 0) {
      return failure("unsupported_type", "Enum fields need at least one value.", `/${key}`);
    }
    return { ok: true, value: { id: key, name: displayName(key), type: "select", options } };
  }
  return failure(
    "unsupported_type",
    `Zod field ${JSON.stringify(key)} (${type}) has no Database property mapping.`,
    `/${key}`,
  );
}

function unwrap(
  field: ZodNode,
):
  | { readonly ok: true; readonly value: ZodNode }
  | Extract<DatabaseDocumentFromZodResult, { readonly ok: false }> {
  let current = field;
  const seen = new Set<ZodNode>();
  while (current.def.type === "optional" || current.def.type === "default" || current.def.type === "nullable") {
    if (seen.has(current) || current.def.innerType === undefined) {
      return failure("unsupported_type", "Wrapped Zod field could not be unwrapped.");
    }
    seen.add(current);
    current = current.def.innerType;
  }
  return { ok: true, value: current };
}

function readIdentity(
  value: unknown,
  index: number,
):
  | { readonly ok: true; readonly value: string }
  | Extract<DatabaseDocumentFromZodResult, { readonly ok: false }> {
  if (typeof value !== "string" || value.length === 0) {
    return failure("missing_id", "Record id must be a non-empty string.", `/${index}/id`);
  }
  return { ok: true, value };
}

function asJSONValue(value: unknown): JSONValue | undefined {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function displayName(key: string): string {
  return key.length === 0 ? key : `${key[0]!.toUpperCase()}${key.slice(1)}`;
}

function recordPointer(index: number, path: ReadonlyArray<PropertyKey>): string {
  return `/${[index, ...path].map((segment) => escapePointerToken(String(segment))).join("/")}`;
}

function escapePointerToken(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

function failure(
  code: string,
  reason?: string,
  pointer?: string,
): Extract<DatabaseDocumentFromZodResult, { readonly ok: false }> {
  return {
    ok: false,
    code,
    ...(reason === undefined ? {} : { reason }),
    ...(pointer === undefined ? {} : { pointer }),
  };
}
