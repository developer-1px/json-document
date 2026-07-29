// RFC 6901 — JSON Pointer.
// 문자열과 segment 배열 사이의 변환은 lossless다.

import { parseArrayIndex } from "./arrayIndex.js";

export type Pointer = string;

function escapeSegment(s: string): string {
  if (!s.includes("~") && !s.includes("/")) return s;
  return s.replace(/~/g, "~0").replace(/\//g, "~1");
}

function unescapeSegment(s: string): string {
  if (!s.includes("~")) return s;
  return s.replace(/~1/g, "/").replace(/~0/g, "~");
}

interface BuildPointerOptions {
  /** RFC 6901 §6 — URI fragment 표현 (`#` prefix + percent-encoding). default false. */
  uriFragment?: boolean;
}

export function buildPointer(
  segments: ReadonlyArray<string | number>,
  options: BuildPointerOptions = {},
): Pointer {
  if (segments.length === 0) return options.uriFragment ? "#" : "";
  let body = "";
  for (let index = 0; index < segments.length; index += 1) {
    body += "/" + escapeSegment(String(segments[index]));
  }
  return options.uriFragment ? "#" + encodePointerForFragment(body) : body;
}

function parsePointerSegments(body: string): string[] {
  if (!body.includes("~")) return body.split("/");
  return body.split("/").map((segment) => {
    for (let index = segment.indexOf("~"); index !== -1; index = segment.indexOf("~", index + 2)) {
      const escaped = segment[index + 1];
      if (escaped !== "0" && escaped !== "1") {
        throw new PointerSyntaxError(`Invalid JSON Pointer escape in segment: ${JSON.stringify(segment)}`);
      }
    }
    return unescapeSegment(segment);
  });
}

export function parsePointer(pointer: Pointer): string[] {
  if (pointer === "" || pointer === "#") return [];
  // RFC 6901 §6 — URI fragment 형식 (`#/foo`) 자동 디코드.
  if (pointer[0] === "#") {
    if (pointer[1] !== "/") {
      throw new PointerSyntaxError(`JSON Pointer URI fragment must be '#' or start with '#/': ${JSON.stringify(pointer)}`);
    }
    let decoded: string;
    try {
      decoded = decodeURIComponent(pointer.slice(2));
    } catch (error) {
      throw new PointerSyntaxError(
        error instanceof Error
          ? `Invalid JSON Pointer URI fragment encoding: ${error.message}`
          : "Invalid JSON Pointer URI fragment encoding",
      );
    }
    return parsePointerSegments(decoded);
  }
  if (pointer[0] !== "/") {
    throw new PointerSyntaxError(`JSON Pointer must be empty or start with '/': ${JSON.stringify(pointer)}`);
  }
  return parsePointerSegments(pointer.slice(1));
}

export function tryParsePointer(pointer: Pointer): string[] | null {
  if (pointer === "" || pointer === "#") return [];
  if (pointer[0] === "#") {
    if (pointer[1] !== "/") return null;
    try {
      return parsePointerSegments(decodeURIComponent(pointer.slice(2)));
    } catch {
      return null;
    }
  }
  if (pointer[0] !== "/") return null;
  try {
    return parsePointerSegments(pointer.slice(1));
  } catch {
    return null;
  }
}

// RFC 3986 + 6901 §6: fragment 안에서 안전하지 않은 문자 percent-encode.
// JSON Pointer 자체의 escape (~0, ~1) 는 이미 처리됐으므로 fragment 의 추가 제약만.
function encodePointerForFragment(s: string): string {
  // encodeURI는 Unicode를 UTF-8 octet으로 바꾼 뒤 percent-encode한다.
  // Fragment delimiter인 #만 JSON Pointer 본문에 남지 않도록 추가 인코드한다.
  return encodeURI(s).replace(/#/g, "%23");
}

export class PointerSyntaxError extends Error {
  override readonly name = "PointerSyntaxError";
}

// ── Path arithmetic (state-free, schema-free) ───────────────────────────────
// RFC 6901 위의 순수 path 조작으로 state와 schema를 알지 못한다.

/** Parent pointer. `""` (root) 는 `null`. `"/a"` → `""`, `"/a/b"` → `"/a"`. */
export function parentPointer(pointer: Pointer): Pointer | null {
  if (pointer === "") return null;
  const i = pointer.lastIndexOf("/");
  return i <= 0 ? "" : pointer.slice(0, i);
}

/** Pointer 끝에 segment 추가. `appendSegment("/a", 0)` → `"/a/0"`, escape 자동. */
export function appendSegment(pointer: Pointer, seg: string | number): Pointer {
  return pointer + "/" + escapeSegment(String(seg));
}

// ── Internal helpers (not in public index) ──────────────────────────────────

/** segs prefix check. */
export function isPrefix(prefix: ReadonlyArray<string>, full: ReadonlyArray<string>): boolean {
  if (prefix.length > full.length) return false;
  for (let i = 0; i < prefix.length; i++) if (prefix[i] !== full[i]) return false;
  return true;
}

/** state + segments → value. boolean ok. `"-"` 는 path_not_found 로 취급. */
export function readAt(state: unknown, segs: ReadonlyArray<string>): { ok: true; value: unknown } | { ok: false } {
  let cur: unknown = state;
  for (const seg of segs) {
    if (cur === null || typeof cur !== "object") return { ok: false };
    if (Array.isArray(cur)) {
      // RFC 6901 §4: 배열 인덱스는 `0` 또는 `[1-9][0-9]*` 만 허용. write path 와
      // 동일한 strict 파서를 써서 1.0/01/+1/"-" 같은 non-canonical 토큰을 거부한다.
      const i = parseArrayIndex(seg);
      if (i === null) return { ok: false };
      if (i >= cur.length) return { ok: false };
      cur = cur[i];
    } else {
      if (!Object.prototype.hasOwnProperty.call(cur, seg)) return { ok: false };
      cur = (cur as Record<string, unknown>)[seg];
    }
  }
  return { ok: true, value: cur };
}
