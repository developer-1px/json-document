import { describe, expect, test } from "vitest";
import {
  initialAnnotationSnapshot,
  restoreAnnotationSnapshot,
  serializeAnnotationSnapshot,
  type AnnotationSnapshot,
} from "../../src/routes/annotation-demo/annotation-state";

describe("annotation state", () => {
  test("round-trips structured annotations independently from the raster", () => {
    const snapshot: AnnotationSnapshot = {
      document: {
        ...initialAnnotationSnapshot.document,
        annotations: [{
          id: "annotation-1",
          target: { type: "rectangle", x: 120, y: 80, width: 320, height: 180 },
          body: { instruction: "이 영역을 더 밝게" },
          mark: { type: "rectangle" },
        }],
      },
      selectedId: "annotation-1",
    };

    const serialized = serializeAnnotationSnapshot(snapshot);

    expect(serialized).not.toContain("data:image");
    expect(restoreAnnotationSnapshot(serialized)).toEqual(snapshot);
  });

  test("accepts a valid replacement raster source", () => {
    const replacement = {
      ...initialAnnotationSnapshot,
      document: {
        ...initialAnnotationSnapshot.document,
        source: { id: "replacement", src: "data:image/png;base64,AA==", width: 640, height: 480 },
      },
    };

    expect(restoreAnnotationSnapshot(JSON.stringify(replacement))).toEqual(replacement);
  });

  test("rejects an invalid raster source contract", () => {
    const unsupported = JSON.stringify({
      ...initialAnnotationSnapshot,
      document: {
        ...initialAnnotationSnapshot.document,
        source: { ...initialAnnotationSnapshot.document.source, width: 0 },
      },
    });

    expect(() => restoreAnnotationSnapshot(unsupported)).toThrow("Unsupported annotation document");
  });
});
