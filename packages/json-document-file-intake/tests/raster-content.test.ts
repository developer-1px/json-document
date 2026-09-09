import { expect, test } from "vitest";
import { assertRasterImageContent, assertRasterImageSource } from "../src/index.js";

test.each(["png", "jpeg", "webp"])("PI-CONTENT: %s embedded source is a portable syntax contract, not a decoder", (type) => {
  const image = { source: `data:image/${type};base64,AQID`, width: 1, height: 2 };
  expect(() => assertRasterImageContent(image)).not.toThrow();
  expect(JSON.parse(JSON.stringify(image))).toEqual(image);
});

test.each(["https://example.com/a.png", "blob:temporary", "data:image/svg+xml;base64,AQID", "data:image/png;base64,A=ID", "data:image/png;base64,"])("PI-CONTENT: rejects nonportable or malformed source %s", (source) => {
  expect(() => assertRasterImageSource(source)).toThrow(TypeError);
});

test.each([0, -1, 1.5, NaN, Infinity])("PI-CONTENT: rejects invalid raster dimension %s", (width) => {
  expect(() => assertRasterImageContent({ source: "data:image/png;base64,AQID", width, height: 1 })).toThrow(TypeError);
});
