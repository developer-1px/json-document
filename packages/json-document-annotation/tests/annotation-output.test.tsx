import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { ANNOTATION_PROFILE_V1, createAnnotationEditor, type AnnotationDocument } from "@interactive-os/json-document-editing";
import { renderWebAnnotationRaster, type WebAnnotationRasterResult } from "@interactive-os/json-document-web";
import { useAnnotationOutput } from "../src/index.js";

vi.mock("@interactive-os/json-document-web", async (load) => ({ ...await load<object>(), renderWebAnnotationRaster: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const initial: AnnotationDocument = { profile: ANNOTATION_PROFILE_V1, id: "test", sources: [{ id: "image", src: "/image.png", width: 100, height: 80 }], annotations: [] };
const rasterStyle = { stroke: "red", fill: "red", lineWidth: 2, labelFont: "12px sans-serif" };
function setup() {
  const document = createJSONDocument(initial), editor = createAnnotationEditor(document);
  return { document, editor, sourceUrl: "/image.png", rasterStyle, renderImage: false };
}

test("serializes only the document and restores a saved snapshot with cleared selection", () => {
  const options = setup();
  const { result } = renderHook(() => useAnnotationOutput(options));
  expect(result.current.restore()).toBe(false);
  act(() => result.current.save());
  act(() => { options.editor.dispatch({ type: "annotation.create", annotation: { id: "note", body: { instruction: "Inspect" }, presentation: { type: "marker" }, target: { sourceId: "image", selector: { type: "point", x: 10, y: 20 } } } }); });
  expect(options.editor.snapshot.selection.primaryId).toBe("note");
  expect(JSON.parse(result.current.structured)).toEqual(options.document.value);
  expect(JSON.parse(decodeURIComponent(result.current.structuredDownloadUrl.split(",")[1]!))).toEqual(options.document.value);
  expect(result.current.structured).not.toContain("primaryId");
  act(() => { expect(result.current.restore()).toBe(true); });
  expect(options.document.value).toEqual(initial);
  expect(options.editor.snapshot.selection.ids).toEqual([]);
});

test("does not restore a snapshot from a replaced document owner", () => {
  const { result, rerender } = renderHook(useAnnotationOutput, { initialProps: setup() });
  act(() => result.current.save());
  rerender(setup());
  expect(result.current.canRestore).toBe(false);
  expect(result.current.restore()).toBe(false);
});

test("renders lazily, ignores stale raster completion, and exposes the current failure", async () => {
  const pending: Array<(result: WebAnnotationRasterResult) => void> = [];
  vi.mocked(renderWebAnnotationRaster).mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
  const options = setup();
  const { result, rerender } = renderHook(useAnnotationOutput, { initialProps: options });
  expect(pending).toHaveLength(0);
  rerender({ ...options, renderImage: true });
  expect(pending).toHaveLength(1);
  rerender({ ...options, renderImage: true, sourceUrl: "/new.png" });
  expect(pending).toHaveLength(2);
  await act(async () => pending[0]!({ ok: true, dataURL: "data:old" }));
  expect(result.current.renderedImage).toBeNull();
  await act(async () => pending[1]!({ ok: false, code: "raster.decode-failed" }));
  await waitFor(() => expect(result.current.imageError).toBe(true));
});


test("reports an unexpected raster rejection without an unhandled promise", async () => {
  vi.mocked(renderWebAnnotationRaster).mockRejectedValue(new Error("canvas unavailable"));
  const options = { ...setup(), renderImage: true };
  const { result } = renderHook(() => useAnnotationOutput(options));
  await waitFor(() => expect(result.current.imageError).toBe(true));
});
