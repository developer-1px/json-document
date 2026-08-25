import type { JSONValue } from "@interactive-os/json-document";

export interface FileCandidate extends Record<string, JSONValue> {
  readonly name: string;
  readonly size: number;
  readonly mediaType: string | null;
}

export interface FileAcceptancePolicy extends Record<string, JSONValue> {
  readonly acceptedMediaTypes: ReadonlyArray<string>;
  readonly maxFiles: number | null;
  readonly maxBytesPerFile: number | null;
}

export type FileIntakeResult<Candidate extends FileCandidate = FileCandidate> =
  | { readonly ok: true; readonly candidates: ReadonlyArray<Candidate> }
  | { readonly ok: false; readonly code: "file-intake.invalid" | "file-intake.limit" | "file-intake.media-type" | "file-intake.size"; readonly candidate: Candidate };

/** Validates serializable file metadata independently of DOM File instances and product storage. */
export function validateFileCandidates<Candidate extends FileCandidate>(
  candidates: ReadonlyArray<Candidate>,
  policy: FileAcceptancePolicy,
  options: { readonly currentCount?: number } = {},
): FileIntakeResult<Candidate> {
  if (candidates.length === 0) return { ok: true, candidates };
  const currentCount = options.currentCount ?? 0;
  if (!Number.isInteger(currentCount) || currentCount < 0) return { ok: false, code: "file-intake.invalid", candidate: candidates[0]! };
  if (policy.maxFiles !== null && currentCount + candidates.length > policy.maxFiles) {
    return { ok: false, code: "file-intake.limit", candidate: candidates[0]! };
  }
  for (const candidate of candidates) {
    if (candidate.name.length === 0 || !Number.isFinite(candidate.size) || candidate.size < 0) return { ok: false, code: "file-intake.invalid", candidate };
    if (policy.maxBytesPerFile !== null && candidate.size > policy.maxBytesPerFile) return { ok: false, code: "file-intake.size", candidate };
    if (!acceptsMediaType(candidate.mediaType, policy.acceptedMediaTypes)) return { ok: false, code: "file-intake.media-type", candidate };
  }
  return { ok: true, candidates };
}

function acceptsMediaType(mediaType: string | null, accepted: ReadonlyArray<string>): boolean {
  if (accepted.length === 0 || accepted.includes("*/*")) return true;
  const value = mediaType ?? "";
  return accepted.some((pattern) => pattern === value || (pattern.endsWith("/*") && value.startsWith(pattern.slice(0, -1))));
}
