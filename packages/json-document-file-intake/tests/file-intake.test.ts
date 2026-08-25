import { describe, expect, test } from "vitest";
import { validateFileCandidates } from "../src/index.js";

const imagePolicy = { acceptedMediaTypes: ["image/*"], maxFiles: 2, maxBytesPerFile: 100 } as const;

describe("file intake contract", () => {
  test("accepts platform-independent file metadata", () => {
    const candidates = [{ name: "brief.png", size: 24, mediaType: "image/png", source: "fixture" }];
    expect(validateFileCandidates(candidates, imagePolicy)).toEqual({ ok: true, candidates });
  });

  test("owns count, size, media type, and metadata validation", () => {
    expect(validateFileCandidates([{ name: "a.png", size: 1, mediaType: "image/png" }], imagePolicy, { currentCount: 2 })).toMatchObject({ code: "file-intake.limit" });
    expect(validateFileCandidates([{ name: "a.png", size: 101, mediaType: "image/png" }], imagePolicy)).toMatchObject({ code: "file-intake.size" });
    expect(validateFileCandidates([{ name: "a.pdf", size: 1, mediaType: "application/pdf" }], imagePolicy)).toMatchObject({ code: "file-intake.media-type" });
    expect(validateFileCandidates([{ name: "", size: -1, mediaType: null }], imagePolicy)).toMatchObject({ code: "file-intake.invalid" });
  });
});
