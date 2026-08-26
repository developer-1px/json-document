import type { Annotation, AnnotationDocument, AnnotationPoint, AnnotationSelector } from "./annotation.js";

export function assertAnnotationDocument(document: AnnotationDocument): void {
  if (document.profile !== "urn:interactive-os:json-document:annotation:1" || !nonEmpty(document.id)) fail("profile/id");
  if (!Array.isArray(document.sources) || document.sources.length === 0) fail("sources");
  const sourceIds = new Set<string>();
  for (const source of document.sources) {
    if (!nonEmpty(source.id) || sourceIds.has(source.id) || !nonEmpty(source.src) || !positive(source.width) || !positive(source.height)) fail("source");
    sourceIds.add(source.id);
  }
  const ids = new Set<string>();
  for (const annotation of document.annotations) {
    assertAnnotation(annotation, sourceIds);
    if (ids.has(annotation.id)) fail("annotation.id");
    ids.add(annotation.id);
  }
}

export function assertAnnotation(annotation: Annotation, sourceIds?: ReadonlySet<string>): void {
  if (!nonEmpty(annotation.id) || typeof annotation.body.instruction !== "string") fail("annotation");
  if (!nonEmpty(annotation.target.sourceId) || (sourceIds && !sourceIds.has(annotation.target.sourceId))) fail("target.sourceId");
  assertSelector(annotation.target.selector);
  const compatible = annotation.presentation.type === "marker" ? annotation.target.selector.type === "point"
    : annotation.presentation.type === "reaction" ? annotation.target.selector.type === "point"
    : annotation.presentation.type === "outline" ? annotation.target.selector.type === "rectangle"
      : annotation.presentation.type === "stroke" ? annotation.target.selector.type === "path"
        : annotation.presentation.type === "arrow" && annotation.target.selector.type === "arrow";
  if (!compatible) fail("selector/presentation");
  if (annotation.presentation.type === "reaction" && annotation.presentation.reaction !== "like" && annotation.presentation.reaction !== "dislike") fail("presentation.reaction");
}

function assertSelector(selector: AnnotationSelector): void {
  if (selector.type === "point") return assertPoint(selector);
  if (selector.type === "rectangle") { assertPoint(selector); if (!positive(selector.width) || !positive(selector.height)) fail("rectangle"); return; }
  if (selector.type === "path") { if (selector.points.length < 2) fail("path"); selector.points.forEach(assertPoint); return; }
  assertPoint(selector.from); assertPoint(selector.to);
  if (selector.from.x === selector.to.x && selector.from.y === selector.to.y) fail("arrow");
}

function assertPoint(point: AnnotationPoint): void { if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) fail("point"); }
function nonEmpty(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
function positive(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value > 0; }
function fail(field: string): never { throw new Error(`Invalid Annotation document: ${field}`); }
