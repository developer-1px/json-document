import type { JSONValue } from "@interactive-os/json-document";
/** Download a portable local backup; caller owns the document's validation and filename policy. */
export function downloadWebDocumentFile(value: JSONValue, filename: string): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {type: "application/json"}));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Parse a bounded local file before handing it to the canonical document validator. */
export async function readWebDocumentFile(file: {readonly size: number; text(): Promise<string>}, maxBytes = 10 * 1024 * 1024): Promise<unknown> {
  if (file.size > maxBytes) throw new Error("문서 파일이 허용 크기를 초과했습니다.");
  return JSON.parse(await file.text());
}
