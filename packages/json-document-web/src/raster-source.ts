export type WebRasterSourceResult =
  | { readonly ok: true; readonly dataURL: string; readonly width: number; readonly height: number }
  | { readonly ok: false; readonly code: "raster.read-failed" | "raster.decode-failed"; readonly reason?: string };

/** Structural boundary accepted by `FileReader`; browser `File` instances satisfy it. */
export interface WebRasterFile {
  readonly name: string;
  readonly type: string;
}

export async function readWebRasterFile(file: WebRasterFile): Promise<WebRasterSourceResult> {
  const dataURL = await readDataURL(file);
  if (!dataURL.ok) return dataURL;
  return decodeRaster(dataURL.dataURL);
}

function readDataURL(file: WebRasterFile): Promise<Extract<WebRasterSourceResult, { ok: true }> | Extract<WebRasterSourceResult, { ok: false }>> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve({
      ok: false,
      code: "raster.read-failed",
      ...(reader.error === null ? {} : { reason: reader.error.message }),
    });
    reader.onload = () => typeof reader.result === "string"
      ? resolve({ ok: true, dataURL: reader.result, width: 0, height: 0 })
      : resolve({ ok: false, code: "raster.read-failed" });
    try { reader.readAsDataURL(file as unknown as Blob); } catch (error) {
      resolve({ ok: false, code: "raster.read-failed", reason: message(error) });
    }
  });
}

function decodeRaster(dataURL: string): Promise<WebRasterSourceResult> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onerror = () => resolve({ ok: false, code: "raster.decode-failed" });
    image.onload = () => image.naturalWidth > 0 && image.naturalHeight > 0
      ? resolve({ ok: true, dataURL, width: image.naturalWidth, height: image.naturalHeight })
      : resolve({ ok: false, code: "raster.decode-failed" });
    image.src = dataURL;
  });
}

function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
