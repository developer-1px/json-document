import { useEffect, useState, useSyncExternalStore } from "react";
import type { JSONDocument } from "@interactive-os/json-document";
import type { AnnotationDocument, AnnotationEditor } from "@interactive-os/json-document-editing";
import { renderWebAnnotationRaster, type WebAnnotationRasterStyle } from "@interactive-os/json-document-web";

export interface AnnotationOutputOptions {
  /** The same document instance passed to createAnnotationEditor. */
  readonly document: JSONDocument;
  readonly editor: AnnotationEditor;
  readonly sourceUrl: string;
  readonly rasterStyle: WebAnnotationRasterStyle;
  readonly renderImage: boolean;
}
export interface AnnotationOutput {
  readonly structured: string;
  readonly structuredDownloadUrl: string;
  readonly renderedImage: string | null;
  readonly imageError: boolean;
  readonly canRestore: boolean;
  save(): void;
  restore(): boolean;
}

/** Output lifecycle; the Host owns tabs, copy, links, and panel layout. */
export function useAnnotationOutput(options: AnnotationOutputOptions): AnnotationOutput {
  const { document, editor, sourceUrl, rasterStyle, renderImage } = options;
  useSyncExternalStore(editor.subscribe, () => editor.snapshot.revision, () => editor.snapshot.revision);
  const value = editor.snapshot.value as AnnotationDocument;
  const [saved, setSaved] = useState<{ owner: JSONDocument; value: AnnotationDocument } | null>(null);
  const [image, setImage] = useState<{ value: AnnotationDocument; sourceUrl: string; style: WebAnnotationRasterStyle; dataURL: string | null } | null>(null);
  const { stroke, fill, lineWidth, labelFont } = rasterStyle;
  useEffect(() => {
    if (!renderImage) return;
    let current = true;
    const style = { stroke, fill, lineWidth, labelFont };
    void renderWebAnnotationRaster({ document: value, sourceId: value.sources[0]!.id, sourceURL: sourceUrl, style })
      .then((result) => { if (current) setImage({ value, sourceUrl, style, dataURL: result.ok ? result.dataURL : null }); })
      .catch(() => { if (current) setImage({ value, sourceUrl, style, dataURL: null }); });
    return () => { current = false; };
  }, [value, sourceUrl, stroke, fill, lineWidth, labelFont, renderImage]);
  const currentImage = image?.value === value && image.sourceUrl === sourceUrl && image.style.stroke === stroke && image.style.fill === fill && image.style.lineWidth === lineWidth && image.style.labelFont === labelFont ? image : null;
  const structured = JSON.stringify(value, null, 2);
  return {
    structured,
    structuredDownloadUrl: `data:application/json;charset=utf-8,${encodeURIComponent(structured)}`,
    renderedImage: currentImage?.dataURL ?? null,
    imageError: currentImage !== null && currentImage.dataURL === null,
    canRestore: saved?.owner === document,
    save() { setSaved({ owner: document, value }); },
    restore() {
      if (saved?.owner !== document) return false;
      const result = document.commit([{ op: "replace", path: "", value: saved.value }]);
      if (!result.ok) return false;
      editor.dispatch({ type: "selection.set", annotationId: null, mode: "replace" });
      return true;
    },
  };
}
