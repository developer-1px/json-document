import type { TextSurfaceFragment } from "@interactive-os/json-document";
import { JSON_DOCUMENT_CONTENTEDITABLE_MIME } from "./constants.js";
import { isTextSurfaceFragment, plainTextFromFragment } from "./fragment.js";

export {
  isTextSurfaceFragment,
  plainTextFromFragment,
  selectedTextSurfaceFragment,
} from "./fragment.js";

export function writeClipboardFragment(
  event: ClipboardEvent | undefined,
  fragment: TextSurfaceFragment,
  mime = JSON_DOCUMENT_CONTENTEDITABLE_MIME,
): void {
  event?.clipboardData?.setData("text/plain", plainTextFromFragment(fragment));
  event?.clipboardData?.setData(mime, JSON.stringify(fragment));
}

export function readClipboardFragment(
  event: ClipboardEvent | undefined,
  mime = JSON_DOCUMENT_CONTENTEDITABLE_MIME,
): TextSurfaceFragment | null {
  const raw = event?.clipboardData?.getData(mime) ?? "";
  if (raw.length === 0) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    return isTextSurfaceFragment(value) ? value : null;
  } catch {
    return null;
  }
}

export function readClipboardPlainText(event: ClipboardEvent | undefined): string {
  return event?.clipboardData?.getData("text/plain") ?? "";
}
