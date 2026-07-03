// #208 — readAt 은 RFC 6901 canonical 배열 인덱스만 허용해야 하며,
// 읽기 경로가 쓰기 경로와 동일한 인덱스 계약을 따라야 한다.

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createJSONDocument } from "@interactive-os/json-document";

const doc = createJSONDocument(z.object({ arr: z.array(z.number()) }), { arr: [10, 20, 30] });

describe("#208 readAt canonical array index", () => {
  it("resolves a canonical index", () => {
    const r = doc.at("/arr/1");
    expect(r.ok && r.value).toBe(20);
  });

  it.each(["/arr/1.0", "/arr/1e0", "/arr/+1", "/arr/ 1", "/arr/01", "/arr/"])(
    "rejects non-canonical index %s on read",
    (pointer) => {
      expect(doc.at(pointer).ok).toBe(false);
    },
  );

  it("read and write agree: non-canonical index is rejected by both", () => {
    expect(doc.at("/arr/1.0").ok).toBe(false);
    expect(doc.patch({ op: "replace", path: "/arr/1.0", value: 99 }).ok).toBe(false);
  });

  it("rejects out-of-range canonical index", () => {
    expect(doc.at("/arr/3").ok).toBe(false);
  });
});
