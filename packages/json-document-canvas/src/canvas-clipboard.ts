import { createCanvasClipboard, createObjectPasteSession, type CanvasClipboardOptions, type EditingResult, type ObjectEditor, type ObjectPastePreparation, type ObjectSelection } from "@interactive-os/json-document-editing";
import type { FileAcceptancePolicy } from "@interactive-os/json-document-file-intake";
import { assertCanvasDocument } from "@interactive-os/json-document-object-document";
import { captureWebClipboardPaste, createWebClipboardBinding, objectClipboardCodec, readWebRasterFile, readWebRasterFiles, type WebClipboardEvent, type WebFileCandidate } from "@interactive-os/json-document-web";

export interface CanvasClipboardPolicy {
  readonly textColor: string;
  readonly fontSize: number;
  readonly files?: FileAcceptancePolicy;
  readonly maxImagePixels?: number;
}

/** Canvas input composition. File validation, native capture, content conversion, and ordered adoption retain their canonical owners. */
export function createCanvasClipboardBinding(editor: ObjectEditor, policy: CanvasClipboardPolicy, options: {
  readonly readRaster?: typeof readWebRasterFile;
  readonly onResult?: (result: { readonly ok: boolean; readonly code?: string; readonly reason?: string }) => void;
  readonly onPendingChange?: (pending: boolean) => void;
} = {}) {
  const placement = { type: "cascade", dx: 24, dy: 24 } as const;
  const session = createObjectPasteSession(editor, { placement, ...(options.onResult ? { onResult: options.onResult } : {}), ...(options.onPendingChange ? { onPendingChange: options.onPendingChange } : {}) });
  const native = createWebClipboardBinding({
    codec: objectClipboardCodec,
    read: () => editor.copy(),
    cut: (payload) => editor.dispatch({ type: "object.remove", objectIds: payload.objects.map((object) => object.id) }),
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload, placement }),
  });
  const files = policy.files ?? { acceptedMediaTypes: ["image/png", "image/jpeg", "image/webp"], maxFiles: 4, maxBytesPerFile: 10 * 1024 * 1024 };
  const maxPixels = policy.maxImagePixels ?? 16_000_000;
  if (!Number.isFinite(maxPixels) || maxPixels <= 0) throw new TypeError("maxImagePixels must be positive and finite.");

  function contentOptions(): CanvasClipboardOptions {
    const document = editor.snapshot.value;
    assertCanvasDocument(document);
    return { bounds: { x: 0, y: 0, width: document.width * 0.75, height: document.height * 0.75 }, textColor: policy.textColor, fontSize: policy.fontSize };
  }
  async function images(candidates: readonly WebFileCandidate[], content: CanvasClipboardOptions, signal: AbortSignal): Promise<ObjectPastePreparation> {
    const prepared = await readWebRasterFiles(candidates, { policy: files, maxImagePixels: maxPixels, signal, readRaster: options.readRaster ?? readWebRasterFile });
    return prepared.ok
      ? { ok: true, clipboard: createCanvasClipboard({ type: "images", images: prepared.files.map(({ candidate, image }) => ({ ...image, label: candidate.name })) }, content) }
      : prepared;
  }
  return {
    get pending() { return session.pending; },
    cancel: () => session.cancel(),
    copy(event: WebClipboardEvent) {
      session.cancel();
      const result = native.copy(event); options.onResult?.(result); return result;
    },
    cut(event: WebClipboardEvent) {
      session.cancel();
      const result = native.cut(event); options.onResult?.(result); return result;
    },
    paste(event: WebClipboardEvent): Promise<EditingResult<ObjectSelection>> {
      const captured = captureWebClipboardPaste(event, { codec: objectClipboardCodec, files: true, text: true });
      const controller = new AbortController();
      return session.enqueue(() => {
        if (!captured.ok) return captured;
        if (captured.type === "structured") return { ok: true, clipboard: captured.payload };
        const content = contentOptions();
        return captured.type === "text"
          ? { ok: true, clipboard: createCanvasClipboard({ type: "text", text: captured.text }, content) }
          : images(captured.files, content, controller.signal);
      }, () => controller.abort());
    },
  };
}
