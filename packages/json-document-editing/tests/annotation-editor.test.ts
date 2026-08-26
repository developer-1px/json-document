import { describe, expect, test } from "vitest";
import {
  ANNOTATION_PROFILE_V1,
  annotationResizeHandle,
  annotationSelectorBounds,
  assertAnnotationDocument,
  createAnnotationEditor,
  transformAnnotationSelector,
  type Annotation,
  type AnnotationDocument,
} from "../src/index.js";

const source = { id: "source", src: "/cat.png", width: 1200, height: 800 } as const;
const point: Annotation = { id: "point", body: { instruction: "Inspect" }, target: { sourceId: "source", selector: { type: "point", x: 10, y: 20 } }, presentation: { type: "marker" } };
const rectangle: Annotation = { id: "rect", body: { instruction: "Crop" }, target: { sourceId: "source", selector: { type: "rectangle", x: 20, y: 30, width: 40, height: 50 } }, presentation: { type: "outline" } };
const arrow: Annotation = { id: "arrow", body: { instruction: "Follow" }, target: { sourceId: "source", selector: { type: "arrow", from: { x: 0, y: 0 }, to: { x: 10, y: 10 } } }, presentation: { type: "arrow" } };
const reaction: Annotation = { id: "reaction", body: { instruction: "" }, target: { sourceId: "source", selector: { type: "point", x: 30, y: 40 } }, presentation: { type: "reaction", reaction: "like" } };

const legacyRectangleFixture = {
  id: "legacy-rect",
  body: { instruction: "Migrate" },
  target: { type: "rectangle", x: 20, y: 30, width: 40, height: 50 },
  mark: { type: "outline" },
} as const;

function document(annotations: ReadonlyArray<Annotation> = []): AnnotationDocument {
  return { profile: ANNOTATION_PROFILE_V1, id: "annotation-document", sources: [source], annotations };
}

describe("Annotation editor", () => {
  test("validates the profile, source, selector, and presentation relationship", () => {
    expect(() => assertAnnotationDocument(document([point, rectangle, arrow, reaction]))).not.toThrow();
    expect(() => assertAnnotationDocument(document([{ ...point, presentation: { type: "outline" } }]))).toThrow(/selector\/presentation/);
    expect(() => assertAnnotationDocument(document([{ ...reaction, presentation: { type: "reaction", reaction: "love" as "like" } }]))).toThrow(/presentation\.reaction/);
  });

  test("represents a legacy target/mark fixture with the canonical selector/presentation contract", () => {
    const migrated: Annotation = {
      id: legacyRectangleFixture.id,
      body: legacyRectangleFixture.body,
      target: { sourceId: source.id, selector: legacyRectangleFixture.target },
      presentation: legacyRectangleFixture.mark,
    };

    expect(() => assertAnnotationDocument(document([migrated]))).not.toThrow();
    expect(migrated).toMatchObject({
      target: { sourceId: "source", selector: { type: "rectangle" } },
      presentation: { type: "outline" },
    });
  });

  test("creates, edits, moves, resizes, deletes, selects, and restores history", () => {
    const editor = createAnnotationEditor(document());
    expect(editor.dispatch({ type: "annotation.create", annotation: rectangle }).ok).toBe(true);
    expect(editor.snapshot.selection.primaryId).toBe("rect");
    expect(JSON.stringify(editor.snapshot.value)).not.toContain("selection");
    expect(JSON.stringify(editor.snapshot.value)).not.toContain("primaryId");
    expect(editor.dispatch({ type: "annotation.body.set", annotationId: "rect", instruction: "Updated" }).ok).toBe(true);
    expect(editor.dispatch({ type: "annotation.move", annotationId: "rect", dx: 5, dy: -5 }).ok).toBe(true);
    expect(editor.dispatch({ type: "annotation.resize", annotationId: "rect", handle: "south-east", dx: -100, dy: 10 }).ok).toBe(true);
    expect((editor.snapshot.value as AnnotationDocument).annotations[0]).toMatchObject({
      body: { instruction: "Updated" },
      target: { selector: { x: 25, y: 25, width: 1, height: 60 } },
    });
    expect(editor.dispatch({ type: "selection.set", annotationId: "rect", mode: "toggle" }).ok).toBe(true);
    expect(editor.snapshot.selection.ids).toEqual([]);
    expect(editor.dispatch({ type: "annotation.delete", annotationId: "rect" }).ok).toBe(true);
    expect((editor.snapshot.value as AnnotationDocument).annotations).toEqual([]);
    expect(editor.undo().ok).toBe(true);
    expect((editor.snapshot.value as AnnotationDocument).annotations).toHaveLength(1);
    expect(editor.redo().ok).toBe(true);
    expect((editor.snapshot.value as AnnotationDocument).annotations).toHaveLength(0);
  });

  test("moves path geometry and resizes only compatible selectors", () => {
    const path: Annotation = { id: "path", body: { instruction: "Trace" }, target: { sourceId: "source", selector: { type: "path", points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] } }, presentation: { type: "stroke" } };
    const editor = createAnnotationEditor(document([path, arrow]));
    expect(editor.dispatch({ type: "annotation.move", annotationId: "path", dx: 2, dy: 3 }).ok).toBe(true);
    expect((editor.snapshot.value as AnnotationDocument).annotations[0]!.target.selector).toMatchObject({ points: [{ x: 3, y: 5 }, { x: 5, y: 7 }] });
    expect(editor.dispatch({ type: "annotation.resize", annotationId: "path", handle: "south-east", dx: 2, dy: 3 }).ok).toBe(true);
    expect(editor.dispatch({ type: "annotation.resize", annotationId: "arrow", handle: "end", dx: 5, dy: -2 }).ok).toBe(true);
  });

  test("projects preview geometry through the same selector contract used by commits", () => {
    const transform = { type: "resize", handle: "south-east", dx: 10, dy: -20 } as const;
    const projected = transformAnnotationSelector(rectangle.target.selector, transform);
    const editor = createAnnotationEditor(document([rectangle]));
    editor.dispatch({ type: "annotation.resize", annotationId: rectangle.id, handle: transform.handle, dx: transform.dx, dy: transform.dy });
    expect((editor.snapshot.value as AnnotationDocument).annotations[0]!.target.selector).toEqual(projected);
    expect(annotationSelectorBounds(rectangle.target.selector)).toEqual({ x: 20, y: 30, width: 40, height: 50 });
    expect(annotationResizeHandle(rectangle.target.selector)).toBe("south-east");
    expect(annotationResizeHandle(point.target.selector)).toBeNull();
  });
});
