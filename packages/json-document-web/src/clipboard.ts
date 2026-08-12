import type {
  DocumentBlock,
  DocumentClipboard,
  SheetClipboard,
} from "@interactive-os/json-document-editing";

export interface WebClipboardPayload {
  readonly type: string;
  readonly text: string;
}

export interface WebClipboardData {
  readonly types: ReadonlyArray<string>;
  getData(format: string): string;
  setData(format: string, data: string): void;
}

export interface WebClipboardEvent {
  readonly clipboardData: WebClipboardData | null;
  preventDefault(): void;
}

export interface WebClipboardCodec<Payload extends WebClipboardPayload> {
  readonly mimeType: Payload["type"];
  encode(payload: Payload): string;
  decode(serialized: string): Payload | null;
}

export type WebClipboardResult<Payload extends WebClipboardPayload, EditingResult> =
  | { readonly ok: true; readonly operation: "copy"; readonly payload: Payload }
  | { readonly ok: true; readonly operation: "cut" | "paste"; readonly payload: Payload; readonly result: EditingResult }
  | { readonly ok: false; readonly code: "clipboard.unavailable" | "clipboard.empty" | "clipboard.invalid" | "clipboard.unsupported" | "editing.rejected"; readonly reason?: string };

export interface WebClipboardBinding<Payload extends WebClipboardPayload, EditingResult> {
  copy(event: WebClipboardEvent): WebClipboardResult<Payload, EditingResult>;
  cut(event: WebClipboardEvent): WebClipboardResult<Payload, EditingResult>;
  paste(event: WebClipboardEvent): WebClipboardResult<Payload, EditingResult>;
}

export const documentClipboardCodec: WebClipboardCodec<DocumentClipboard> = jsonCodec(
  "application/vnd.interactive-os.blocks+json",
  isDocumentClipboard,
);

export const sheetClipboardCodec: WebClipboardCodec<SheetClipboard> = jsonCodec(
  "application/vnd.interactive-os.sheet+json",
  isSheetClipboard,
);

export function createWebClipboardBinding<
  Payload extends WebClipboardPayload,
  EditingResult extends { readonly ok: boolean; readonly code?: string; readonly reason?: string },
>(options: {
  readonly codec: WebClipboardCodec<Payload>;
  readonly read: () => Payload | null;
  readonly cut?: (payload: Payload) => EditingResult;
  readonly paste: (payload: Payload) => EditingResult;
}): WebClipboardBinding<Payload, EditingResult> {
  function write(event: WebClipboardEvent):
    | { readonly ok: true; readonly payload: Payload }
    | Extract<WebClipboardResult<never, never>, { readonly ok: false }> {
    const data = event.clipboardData;
    if (data === null) return failure("clipboard.unavailable");
    const payload = options.read();
    if (payload === null) return failure("clipboard.empty");
    try {
      data.setData(options.codec.mimeType, options.codec.encode(payload));
      data.setData("text/plain", payload.text);
    } catch (error) {
      return failure("clipboard.unavailable", errorMessage(error));
    }
    return { ok: true, payload };
  }

  return {
    copy(event) {
      const written = write(event);
      if (!written.ok) return written;
      event.preventDefault();
      return { ok: true, operation: "copy", payload: written.payload };
    },
    cut(event) {
      if (options.cut === undefined) return failure("clipboard.unsupported");
      const written = write(event);
      if (!written.ok) return written;
      const result = options.cut(written.payload);
      if (!result.ok) return failure("editing.rejected", result.reason ?? result.code);
      event.preventDefault();
      return { ok: true, operation: "cut", payload: written.payload, result };
    },
    paste(event) {
      const data = event.clipboardData;
      if (data === null) return failure("clipboard.unavailable");
      if (!Array.from(data.types).includes(options.codec.mimeType)) {
        return failure("clipboard.empty");
      }
      let payload: Payload | null;
      try {
        payload = options.codec.decode(data.getData(options.codec.mimeType));
      } catch (error) {
        return failure("clipboard.invalid", errorMessage(error));
      }
      if (payload === null) return failure("clipboard.invalid");
      const result = options.paste(payload);
      if (!result.ok) return failure("editing.rejected", result.reason ?? result.code);
      event.preventDefault();
      return { ok: true, operation: "paste", payload, result };
    },
  };
}

function jsonCodec<Payload extends WebClipboardPayload>(
  mimeType: Payload["type"],
  accepts: (value: unknown) => value is Payload,
): WebClipboardCodec<Payload> {
  return {
    mimeType,
    encode: (payload) => JSON.stringify(payload),
    decode(serialized) {
      if (serialized.length === 0) return null;
      const value: unknown = JSON.parse(serialized);
      return accepts(value) ? value : null;
    },
  };
}

function isDocumentClipboard(value: unknown): value is DocumentClipboard {
  if (!isRecord(value) || value.type !== documentClipboardCodec.mimeType || typeof value.text !== "string") return false;
  return Array.isArray(value.blocks) && value.blocks.every(isDocumentBlock);
}

function isDocumentBlock(value: unknown): value is DocumentBlock {
  return isRecord(value) && typeof value.id === "string" && typeof value.text === "string";
}

function isSheetClipboard(value: unknown): value is SheetClipboard {
  if (!isRecord(value) || value.type !== sheetClipboardCodec.mimeType || typeof value.text !== "string") return false;
  if (!Array.isArray(value.cells) || value.cells.length === 0) return false;
  const width = Array.isArray(value.cells[0]) ? value.cells[0].length : 0;
  return width > 0 && value.cells.every((row) => (
    Array.isArray(row)
    && row.length === width
    && row.every(isJSONValue)
  ));
}

function isJSONValue(value: unknown): boolean {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every(isJSONValue);
  return isRecord(value) && Object.values(value).every(isJSONValue);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failure(
  code: Extract<WebClipboardResult<never, never>, { readonly ok: false }>["code"],
  reason?: string,
): WebClipboardResult<never, never> {
  return reason === undefined ? { ok: false, code } : { ok: false, code, reason };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
