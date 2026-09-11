/** URL eligibility policy; callers own document-kind and target-specific values. */
export interface DocumentURLPolicy {
  readonly schemes: readonly string[];
  readonly relative: "any" | "explicit";
  readonly controlCharacters: "reject" | "ignore-for-scheme";
}

/** Return the unchanged source URL when allowed; never decode, resolve, or fetch it. */
export function resolveDocumentURL(value: string | null | undefined, policy: DocumentURLPolicy): string | undefined {
  if (!value) return undefined;
  if (policy.controlCharacters === "reject" && /[\u0000-\u001f\u007f]/.test(value)) return undefined;
  const inspected = policy.controlCharacters === "ignore-for-scheme" ? value.replace(/[\u0000-\u0020\u007f]/g, "") : value;
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(inspected)?.[1]?.toLowerCase();
  if (scheme) return policy.schemes.some(allowed => allowed.toLowerCase() === scheme) ? value : undefined;
  return policy.relative === "any" || /^(\/|\.\/|\.\.\/|#|\?)/.test(inspected) ? value : undefined;
}
