import type * as z from "zod";
import { parsePointer, type Pointer } from "../../../foundation/pointer/index.js";
import { numericSegment } from "../../../foundation/patch/index.js";
import { schemaAtPointer } from "../inspection/introspection.js";
import { isJsonPrimitive, isPlainStringKeySchema } from "./knownJson.js";
import { getArrayElement, getDef, getObjectShape } from "../inspection/zod.js";

interface LocalSchemaCache {
  pointerSchemas: Map<string, z.ZodType | null>;
}

type LocalSchemaValidationCapability = "none" | "replace" | "all";

const localSchemaValidationCapabilityCache = new WeakMap<object, LocalSchemaValidationCapability>();
const knownJsonOutputSchemaCache = new WeakMap<object, boolean>();
const localSchemaCaches = new WeakMap<object, LocalSchemaCache>();

export function arrayElementSchemaAtParent(schema: z.ZodType, parent: Pointer): z.ZodType | null {
  const parentSchema = cachedSchemaAtPointer(schema, parent, "value");
  return parentSchema ? getArrayElement(parentSchema) : null;
}

export function cachedSchemaAtPointer(
  schema: z.ZodType,
  pointer: Pointer,
  mode: "value" | "insert" = "value",
): z.ZodType | null {
  let cache = localSchemaCaches.get(schema as object);
  if (!cache) {
    cache = { pointerSchemas: new Map() };
    localSchemaCaches.set(schema as object, cache);
  }
  const key = `${mode}\0${pointer}`;
  const cached = cache.pointerSchemas.get(key);
  if (cached !== undefined) return cached;
  const result = schemaAtPointer(schema, pointer, mode);
  cache.pointerSchemas.set(key, result);
  return result;
}

export function isPlainStructuralSchema(schema: z.ZodType, seen?: WeakSet<object>): boolean {
  return localSchemaValidationCapability(schema, seen) === "all";
}

export function supportsLocalReplaceSchemaValidation(schema: z.ZodType): boolean {
  return localSchemaValidationCapability(schema) !== "none";
}

function localSchemaValidationCapability(
  schema: z.ZodType,
  seen?: WeakSet<object>,
): LocalSchemaValidationCapability {
  const cached = localSchemaValidationCapabilityCache.get(schema as object);
  if (cached !== undefined) return cached;
  const shouldCache = seen === undefined;
  const activeSeen = seen ?? new WeakSet<object>();
  if (activeSeen.has(schema as object)) return "all";
  activeSeen.add(schema as object);
  const finish = (capability: LocalSchemaValidationCapability): LocalSchemaValidationCapability => {
    activeSeen.delete(schema as object);
    if (shouldCache) localSchemaValidationCapabilityCache.set(schema as object, capability);
    return capability;
  };

  const def = getDef(schema);
  if (def.coerce || typeof def.error === "function") return finish("none");
  // Standalone checks such as `z.stringFormat(name, fn)` keep their check on
  // the schema definition instead of `def.checks`. Keep these on full-root
  // validation; otherwise a dynamic custom check can be skipped by an edit to
  // an unrelated path. Chained declarative checks are classified below.
  if (typeof def.check === "string" || typeof def.fn === "function") {
    return finish("none");
  }
  const hasChecks = Array.isArray(def.checks) && def.checks.length > 0;

  switch (def.type) {
    case "object": {
      if (hasChecks) return finish("none");
      const shape = getObjectShape(schema);
      if (!shape) return finish("none");
      const children = Object.values(shape);
      if (def.catchall) children.push(def.catchall);
      return finish(combineLocalSchemaValidationCapabilities(children, activeSeen));
    }
    case "array": {
      if (hasChecks) return finish("none");
      const element = getArrayElement(schema);
      return finish(element ? localSchemaValidationCapability(element, activeSeen) : "none");
    }
    case "record":
      return finish(
        !hasChecks && (!def.keyType || isPlainStringKeySchema(def.keyType)) && def.valueType
          ? localSchemaValidationCapability(def.valueType, activeSeen)
          : "none",
      );
    case "union":
      return finish(
        !hasChecks && Array.isArray(def.options) && def.options.length > 0
          ? combineLocalSchemaValidationCapabilities(def.options, activeSeen)
          : "none",
      );
    case "lazy": {
      if (hasChecks || !def.getter) return finish("none");
      try {
        return finish(localSchemaValidationCapability(def.getter(), activeSeen));
      } catch {
        return finish("none");
      }
    }
    case "optional":
    case "nullable":
      return finish(
        !hasChecks && def.innerType
          ? localSchemaValidationCapability(def.innerType, activeSeen)
          : "none",
      );
    case "string": {
      if (!hasChecks) return finish("all");
      return finish(scalarChecksSupportLocalValidation("string", def.checks) ? "replace" : "none");
    }
    case "number": {
      if (!hasChecks) return finish("all");
      return finish(scalarChecksSupportLocalValidation("number", def.checks) ? "replace" : "none");
    }
    case "boolean":
    case "null":
    case "literal":
    case "enum":
    case "unknown":
    case "any":
    case "never":
      return finish(hasChecks ? "none" : "all");
    default:
      return finish("none");
  }
}

function combineLocalSchemaValidationCapabilities(
  schemas: ReadonlyArray<z.ZodType>,
  seen: WeakSet<object>,
): LocalSchemaValidationCapability {
  let combined: LocalSchemaValidationCapability = "all";
  for (const schema of schemas) {
    const capability = localSchemaValidationCapability(schema, seen);
    if (capability === "none") return "none";
    if (capability === "replace") combined = "replace";
  }
  return combined;
}

function scalarChecksSupportLocalValidation(
  scalar: "string" | "number",
  checks: unknown[] | undefined,
): boolean {
  if (!Array.isArray(checks) || checks.length === 0) return true;
  return checks.every((check) => {
    if (check === null || typeof check !== "object") return false;
    const checkDef = (check as {
      _zod?: { def?: { check?: unknown; fn?: unknown; tx?: unknown; error?: unknown } };
    })._zod?.def;
    if (
      !checkDef
      || typeof checkDef.check !== "string"
      || typeof checkDef.fn === "function"
      || typeof checkDef.error === "function"
    ) {
      return false;
    }
    if (scalar === "number") {
      return checkDef.check === "less_than"
        || checkDef.check === "greater_than"
        || checkDef.check === "multiple_of"
        || checkDef.check === "number_format";
    }
    if (checkDef.check === "overwrite") return isBuiltinTrimOverwrite(checkDef.tx);
    return checkDef.check === "min_length"
      || checkDef.check === "max_length"
      || checkDef.check === "length_equals"
      || checkDef.check === "string_format";
  });
}

function isBuiltinTrimOverwrite(transform: unknown): boolean {
  if (typeof transform !== "function") return false;
  try {
    return Function.prototype.toString.call(transform).replace(/\s+/g, " ")
      === "(input) => input.trim()";
  } catch {
    return false;
  }
}

export function schemaOutputIsKnownJson(schema: z.ZodType, seen?: WeakSet<object>): boolean {
  const cached = knownJsonOutputSchemaCache.get(schema as object);
  if (cached !== undefined) return cached;
  const shouldCache = seen === undefined;
  const finish = (value: boolean): boolean => {
    if (shouldCache) knownJsonOutputSchemaCache.set(schema as object, value);
    return value;
  };
  const activeSeen = seen ?? new WeakSet<object>();
  if (activeSeen.has(schema as object)) return true;
  activeSeen.add(schema as object);

  const def = getDef(schema);
  if (def.coerce || hasPotentiallyOutputChangingChecks(def.checks)) return finish(false);

  switch (def.type) {
    case "object": {
      const shape = getObjectShape(schema);
      if (!shape) return finish(false);
      for (const key of Object.keys(shape)) {
        if (key === "__proto__") return finish(false);
        const child = shape[key];
        if (!child || !schemaOutputIsKnownJson(child, activeSeen)) return finish(false);
      }
      if (def.catchall && !schemaOutputIsKnownJson(def.catchall, activeSeen)) return finish(false);
      return finish(true);
    }
    case "array": {
      const element = getArrayElement(schema);
      return finish(element ? schemaOutputIsKnownJson(element, activeSeen) : false);
    }
    case "nullable":
      return finish(!!def.innerType && schemaOutputIsKnownJson(def.innerType, activeSeen));
    case "nonoptional": {
      if (!def.innerType) return finish(false);
      const innerDef = getDef(def.innerType);
      const outputSchema = innerDef.type === "optional" ? innerDef.innerType : def.innerType;
      return finish(!!outputSchema && schemaOutputIsKnownJson(outputSchema, activeSeen));
    }
    case "prefault":
      return finish(!!def.innerType && schemaOutputIsKnownJson(def.innerType, activeSeen));
    case "pipe":
      return finish(!!def.out && schemaOutputIsKnownJson(def.out, activeSeen));
    case "intersection":
      return finish(!!def.left && !!def.right && schemaOutputIsKnownJson(def.left, activeSeen) && schemaOutputIsKnownJson(def.right, activeSeen));
    case "string":
    case "number":
    case "boolean":
    case "null":
      return finish(true);
    case "literal":
      return finish(Array.isArray(def.values) && def.values.every(isJsonPrimitive));
    case "enum": {
      const values = Array.isArray(def.values) ? def.values : def.entries && typeof def.entries === "object" ? Object.values(def.entries) : null;
      return finish(values !== null && values.every(isJsonPrimitive));
    }
    case "record":
      return finish((!def.keyType || isPlainStringKeySchema(def.keyType)) && !!def.valueType && schemaOutputIsKnownJson(def.valueType, activeSeen));
    case "union":
      return finish(Array.isArray(def.options) && def.options.length > 0 && def.options.every((option) => schemaOutputIsKnownJson(option, activeSeen)));
    case "tuple":
      return finish(Array.isArray(def.items) && def.items.every((item) => schemaOutputIsKnownJson(item, activeSeen)) && (!def.rest || schemaOutputIsKnownJson(def.rest, activeSeen)));
    case "readonly":
      return finish(!!def.innerType && schemaOutputIsKnownJson(def.innerType, activeSeen));
    case "lazy": {
      if (!def.getter) return finish(false);
      try {
        return finish(schemaOutputIsKnownJson(def.getter(), activeSeen));
      } catch {
        return finish(false);
      }
    }
    default:
      return finish(false);
  }
}

function hasPotentiallyOutputChangingChecks(checks: unknown[] | undefined): boolean {
  if (!Array.isArray(checks)) return false;
  return checks.some((check) => {
    if (check === null || typeof check !== "object") return true;
    const kind = (check as { _zod?: { def?: { check?: unknown } } })._zod?.def?.check;
    return kind === "custom" || kind === "overwrite" || typeof kind !== "string";
  });
}

export function prefixIssues(path: Pointer, issues: z.ZodError["issues"]): z.ZodError["issues"] {
  const prefix = parsePointer(path).map((segment) => numericSegment(segment) ?? segment);
  return issues.map((issue) => ({ ...issue, path: [...prefix, ...issue.path] }));
}
