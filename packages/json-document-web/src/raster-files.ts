import { assertRasterImageContent, validateFileCandidates, type FileAcceptancePolicy, type FileCandidate, type RasterImageContent } from "@interactive-os/json-document-file-intake";
import { fileCandidatesFromWebFiles, type WebFileCandidate } from "./file-intake.js";
import { readWebRasterFile, type WebRasterReadSignal } from "./raster-source.js";

export interface WebRasterFileContent {
  readonly candidate: FileCandidate;
  readonly image: RasterImageContent;
}

export type WebRasterFilesResult =
  | { readonly ok: true; readonly files: ReadonlyArray<WebRasterFileContent> }
  | { readonly ok: false; readonly code: string; readonly reason?: string };

/** Validates before reading, decodes sequentially, and returns a complete batch or failure. No document mutation. */
export async function readWebRasterFiles(files: ReadonlyArray<WebFileCandidate>, options: {
  readonly policy: FileAcceptancePolicy;
  readonly maxImagePixels: number;
  readonly signal?: WebRasterReadSignal;
  readonly readRaster?: typeof readWebRasterFile;
}): Promise<WebRasterFilesResult> {
  if (!Number.isFinite(options.maxImagePixels) || options.maxImagePixels <= 0) throw new TypeError("maxImagePixels must be positive and finite.");
  const captured = Array.from(files);
  if (options.signal?.aborted) return { ok: false, code: "raster.cancelled" };
  const candidates = fileCandidatesFromWebFiles(captured);
  const accepted = validateFileCandidates(candidates, options.policy);
  if (!accepted.ok) return accepted;
  if (candidates.some((file) => !["image/png", "image/jpeg", "image/webp"].includes(file.mediaType ?? ""))) return { ok: false, code: "raster.unsupported" };
  const prepared: WebRasterFileContent[] = [];
  for (let index = 0; index < captured.length; index++) {
    if (options.signal?.aborted) return { ok: false, code: "raster.cancelled" };
    try {
      const result = await (options.readRaster ?? readWebRasterFile)(captured[index]!, options.signal ? { signal: options.signal } : {});
      if (options.signal?.aborted) return { ok: false, code: "raster.cancelled" };
      if (!result.ok) return result;
      const image = { source: result.dataURL, width: result.width, height: result.height };
      assertRasterImageContent(image);
      if (image.width * image.height > options.maxImagePixels) return { ok: false, code: "raster.pixel-limit" };
      prepared.push({ candidate: candidates[index]!, image });
    } catch (error) {
      return { ok: false, code: "raster.decode-failed", reason: error instanceof Error ? error.message : String(error) };
    }
  }
  return { ok: true, files: prepared };
}
