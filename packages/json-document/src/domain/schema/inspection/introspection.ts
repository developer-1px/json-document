import type * as z from "zod";
import type { Pointer } from "../../../foundation/pointer/index.js";
import { tryParsePointer } from "../../../foundation/pointer/index.js";
import { getArrayElement, getDef, getObjectShape } from "./zod.js";

export interface DiscriminatedUnionInfo {
  discriminator: string;
  allowed: unknown[];
}

interface SchemaPointerCache {
  schemas: Map<string, z.ZodType | null>;
}

const schemaPointerCaches = new WeakMap<object, SchemaPointerCache>();

export function getDiscriminatedUnionInfo(schema: z.ZodType): DiscriminatedUnionInfo | null {
  const def = getDef(schema);
  if (def.discriminator && Array.isArray(def.options)) {
    return {
      discriminator: def.discriminator,
      allowed: def.options.flatMap((option) => getDiscriminatorValues(option, def.discriminator as string)),
    };
  }
  return null;
}

export function schemaAtPointer(schema: z.ZodType, pointer: Pointer, mode: "value" | "insert" = "value"): z.ZodType | null {
  let cache = schemaPointerCaches.get(schema as object);
  if (!cache) {
    cache = { schemas: new Map() };
    schemaPointerCaches.set(schema as object, cache);
  }
  const cacheKey = `${mode}\0${pointer}`;
  if (cache.schemas.has(cacheKey)) return cache.schemas.get(cacheKey)!;

  const result = schemaAtPointerUncached(schema, pointer, mode);
  cache.schemas.set(cacheKey, result);
  return result;
}

function schemaAtPointerUncached(schema: z.ZodType, pointer: Pointer, mode: "value" | "insert"): z.ZodType | null {
  let current: z.ZodType | null = schema;
  const segments = tryParsePointer(pointer);
  if (segments === null) return null;

  for (let i = 0; i < segments.length && current; i += 1) {
    const segment = segments[i];
    if (segment === undefined) return null;
    // wrapper(optional/nullable/default/pipe/lazy 등)를 벗겨야 안쪽 컨테이너로 내려갈 수 있다.
    const container = unwrapStructuralSchema(current);
    const arrayElement = getArrayElement(container);
    if (arrayElement && isArrayElementSegment(segment)) {
      current = arrayElement;
      continue;
    }

    const shape = getObjectShape(container);
    if (shape && Object.prototype.hasOwnProperty.call(shape, segment)) {
      current = shape[segment] ?? null;
      continue;
    }

    const def = getDef(container);
    if (def.type === "record" && def.valueType) {
      current = def.valueType;
      continue;
    }

    return null;
  }

  if (mode === "insert") {
    if (!current) return null;
    const container = unwrapStructuralSchema(current);
    return getArrayElement(container) ?? current;
  }
  return current;
}

// 단일 inner 를 가진 schema wrapper 를 벗겨 structural schema 로 수렴한다.
// wrapper→inner 매핑은 model/schema.ts 의 schemaOutputIsKnownJson 과 일치시킨다.
function unwrapStructuralSchema(schema: z.ZodType): z.ZodType {
  let current = schema;
  const seen = new Set<z.ZodType>();
  while (!seen.has(current)) {
    seen.add(current);
    const def = getDef(current);
    switch (def.type) {
      case "optional":
      case "nullable":
      case "nonoptional":
      case "prefault":
      case "default":
      case "catch":
      case "readonly":
        if (!def.innerType) return current;
        current = def.innerType;
        continue;
      case "pipe":
        if (!def.out) return current;
        current = def.out;
        continue;
      case "lazy":
        if (!def.getter) return current;
        try {
          current = def.getter();
        } catch {
          return current;
        }
        continue;
      default:
        return current;
    }
  }
  return current;
}

function isArrayElementSegment(segment: string): boolean {
  if (segment === "-") return true;
  if (segment.length === 0) return false;
  for (let index = 0; index < segment.length; index += 1) {
    const code = segment.charCodeAt(index);
    if (code < 48 || code > 57) return false;
  }
  return true;
}

function getDiscriminatorValues(schema: z.ZodType, discriminator: string): unknown[] {
  const shape = getObjectShape(schema);
  const discriminatorSchema = shape?.[discriminator];
  if (!discriminatorSchema) return [];

  const def = getDef(discriminatorSchema);
  if (Array.isArray(def.values)) return def.values;
  if ("value" in def) return [(def as { value: unknown }).value];
  return [];
}
