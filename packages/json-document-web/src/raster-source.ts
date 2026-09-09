export type WebRasterSourceResult =
  | { readonly ok: true; readonly dataURL: string; readonly width: number; readonly height: number }
  | { readonly ok: false; readonly code: "raster.read-failed" | "raster.decode-failed" | "raster.cancelled"; readonly reason?: string };

/** Structural boundary accepted by `FileReader`; browser `File` instances satisfy it. */
export interface WebRasterFile {
  readonly name: string;
  readonly type: string;
}

/** Structural AbortSignal boundary, usable by DOM-free consumers of Web declarations. */
export interface WebRasterReadSignal {
  readonly aborted: boolean;
  addEventListener(type: "abort", listener: () => void, options?: { readonly once?: boolean }): void;
  removeEventListener(type: "abort", listener: () => void): void;
}

export async function readWebRasterFile(file: WebRasterFile, options: { readonly signal?: WebRasterReadSignal } = {}): Promise<WebRasterSourceResult> {
  if (options.signal?.aborted) return { ok: false, code: "raster.cancelled" };
  const dataURL = await readDataURL(file, options.signal);
  if (!dataURL.ok) return dataURL;
  return decodeRaster(dataURL.dataURL, options.signal);
}

function readDataURL(file: WebRasterFile, signal?: WebRasterReadSignal): Promise<WebRasterSourceResult> {
  return new Promise((resolve) => {
    let reader: FileReader;
    try { reader = new FileReader(); } catch (error) { resolve({ ok: false, code: "raster.read-failed", reason: message(error) }); return; }
    function finish(result: WebRasterSourceResult) {
      signal?.removeEventListener("abort", abort);
      reader.onload = reader.onerror = reader.onabort = null;
      resolve(result);
    }
    function abort() { finish({ ok: false, code: "raster.cancelled" }); reader.abort(); }
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    reader.onabort = () => finish({ ok: false, code: "raster.cancelled" });
    reader.onerror = () => finish({
      ok: false,
      code: "raster.read-failed",
      ...(reader.error === null ? {} : { reason: reader.error.message }),
    });
    reader.onload = () => typeof reader.result === "string"
      ? finish({ ok: true, dataURL: reader.result, width: 0, height: 0 })
      : finish({ ok: false, code: "raster.read-failed" });
    try { reader.readAsDataURL(file as unknown as Blob); } catch (error) {
      finish({ ok: false, code: "raster.read-failed", reason: message(error) });
    }
  });
}

function decodeRaster(dataURL: string, signal?: WebRasterReadSignal): Promise<WebRasterSourceResult> {
  return new Promise((resolve) => {
    if (signal?.aborted) { resolve({ ok: false, code: "raster.cancelled" }); return; }
    let image: HTMLImageElement;
    try { image = new Image(); } catch (error) { resolve({ ok: false, code: "raster.decode-failed", reason: message(error) }); return; }
    function finish(result: WebRasterSourceResult) {
      signal?.removeEventListener("abort", abort);
      image.onload = image.onerror = null;
      resolve(result);
    }
    function abort() { finish({ ok: false, code: "raster.cancelled" }); image.src = ""; }
    signal?.addEventListener("abort", abort, { once: true });
    image.onerror = () => finish({ ok: false, code: "raster.decode-failed" });
    image.onload = () => image.naturalWidth > 0 && image.naturalHeight > 0
      ? finish({ ok: true, dataURL, width: image.naturalWidth, height: image.naturalHeight })
      : finish({ ok: false, code: "raster.decode-failed" });
    try { image.src = dataURL; } catch (error) { finish({ ok: false, code: "raster.decode-failed", reason: message(error) }); }
  });
}

function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
