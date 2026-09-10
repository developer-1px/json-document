import type { JSONValue } from "@interactive-os/json-document";

/** Portable embedded image content. Source syntax validation does not prove that bytes decode. */
export interface RasterImageContent extends Record<string, JSONValue> {
  readonly source: string;
  readonly width: number;
  readonly height: number;
}

export function assertRasterImageSource(source: unknown): asserts source is string {
  if (typeof source !== "string") throw new TypeError("Image source must be an embedded PNG, JPEG, or WebP data URL.");
  const separator = source.indexOf(",");
  const header = source.slice(0, separator);
  const bytes = source.slice(separator + 1);
  // Flat checks avoid recursive regex stack growth on large rasters.
  if (!["data:image/png;base64", "data:image/jpeg;base64", "data:image/webp;base64"].includes(header)
    || bytes.length === 0 || bytes.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(bytes)
    || bytes.slice(0, -2).includes("=") || (bytes.at(-2) === "=" && bytes.at(-1) !== "=")) {
    throw new TypeError("Image source must be an embedded PNG, JPEG, or WebP base64 data URL.");
  }
}

export function assertRasterImageContent(value: unknown): asserts value is RasterImageContent {
  if (value === null || typeof value !== "object") throw new TypeError("Expected raster image content.");
  const content = value as Record<string, unknown>;
  assertRasterImageSource(content.source);
  if (typeof content.width !== "number" || typeof content.height !== "number"
    || !Number.isSafeInteger(content.width) || !Number.isSafeInteger(content.height)
    || content.width <= 0 || content.height <= 0) throw new TypeError("Raster dimensions must be positive safe integers.");
}
