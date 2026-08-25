import { assertAnnotationDocument, type AnnotationDocument } from "@interactive-os/json-document-editing";
import { describe, expect, test } from "vitest";
import { annotationSource, initialAnnotationDocument } from "../../src/routes/annotation-demo/annotation-state";

describe("annotation state", () => {
  test("round-trips the canonical document independently from editor selection", () => {
    const document: AnnotationDocument = {
      ...initialAnnotationDocument,
      annotations: [{
        id: "annotation-1",
        target: {
          sourceId: annotationSource.id,
          selector: { type: "rectangle", x: 120, y: 80, width: 320, height: 180 },
        },
        body: { instruction: "이 영역을 더 밝게" },
        presentation: { type: "outline" },
      }],
    };

    const restored = JSON.parse(JSON.stringify(document)) as AnnotationDocument;

    expect(() => assertAnnotationDocument(restored)).not.toThrow();
    expect(restored).toEqual(document);
    expect(JSON.stringify(restored)).not.toContain("selectedId");
  });

  test("accepts a valid replacement raster source", () => {
    const replacement: AnnotationDocument = {
      ...initialAnnotationDocument,
      sources: [{ id: "replacement", src: "replacement.png", width: 640, height: 480 }],
    };

    expect(() => assertAnnotationDocument(replacement)).not.toThrow();
  });

  test("rejects an invalid raster source contract", () => {
    const unsupported = {
      ...initialAnnotationDocument,
      sources: [{ ...annotationSource, width: 0 }],
    } as AnnotationDocument;

    expect(() => assertAnnotationDocument(unsupported)).toThrow("Invalid Annotation document");
  });
});
