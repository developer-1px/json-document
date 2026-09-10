import { routeWebClipboardEvent } from "./clipboard-event.js";
import {
  databaseClipboardFormat,
  documentClipboardFormat,
  objectClipboardFormat,
  orderClipboardFormat,
  sheetClipboardFormat,
  treeClipboardFormat,
} from "@interactive-os/json-document-editing";
import type { WebFileCandidate, WebFileCandidateList } from "./file-intake.js";
import { parseWebClipboardHTML, type WebHTMLClipboardContent } from "./html-clipboard.js";

export interface WebClipboardPayload {
  readonly type: string;
  readonly text: string;
}

export interface WebClipboardData {
  readonly types: ReadonlyArray<string>;
  readonly files?: WebFileCandidateList;
  getData(format: string): string;
  setData(format: string, data: string): void;
}

export interface WebClipboardEvent {
  readonly target?: object | null;
  readonly currentTarget?: object | null;
  readonly defaultPrevented?: boolean;
  readonly clipboardData: WebClipboardData | null;
  preventDefault(): void;
}

export type WebClipboardPaste<Payload extends WebClipboardPayload> =
  | { readonly ok: true; readonly type: "structured"; readonly payload: Payload }
  | { readonly ok: true; readonly type: "files"; readonly files: ReadonlyArray<WebFileCandidate> }
  | { readonly ok: true; readonly type: "text"; readonly text: string }
  | Extract<WebClipboardResult<never, never>, { readonly ok: false }>;

export type WebHTMLClipboardPaste<Payload extends WebClipboardPayload> = WebClipboardPaste<Payload>
  | { readonly ok: true; readonly type: "html"; readonly content: WebHTMLClipboardContent };

/** Existing callers retain the original result union; HTML image capture is opt-in. */
export function captureWebClipboardPaste<Payload extends WebClipboardPayload = WebClipboardPayload>(event: WebClipboardEvent, options: {
  readonly codec?: WebClipboardCodec<Payload>; readonly files?: boolean; readonly text?: boolean; readonly html?: never; readonly delegatedMimeTypes?: ReadonlyArray<string>;
}): WebClipboardPaste<Payload>;
export function captureWebClipboardPaste<Payload extends WebClipboardPayload = WebClipboardPayload>(event: WebClipboardEvent, options: {
  readonly codec?: WebClipboardCodec<Payload>; readonly files?: boolean; readonly text?: boolean; readonly html?: "images"; readonly delegatedMimeTypes?: ReadonlyArray<string>;
}): WebHTMLClipboardPaste<Payload>;
/** Captures one enabled representation: structured → files → HTML with images → literal text. */
export function captureWebClipboardPaste<Payload extends WebClipboardPayload = WebClipboardPayload>(event: WebClipboardEvent, options: {
  readonly codec?: WebClipboardCodec<Payload>;
  readonly files?: boolean;
  readonly text?: boolean;
  readonly html?: "images";
  readonly delegatedMimeTypes?: ReadonlyArray<string>;
}): WebHTMLClipboardPaste<Payload> {
  const data = event.clipboardData;
  if (data === null) return failure("clipboard.unavailable");
  try {
    if (options.delegatedMimeTypes && Array.from(data.types).some((type) => options.delegatedMimeTypes!.includes(type))) return failure("clipboard.empty");
    if (options.codec && Array.from(data.types).includes(options.codec.mimeType)) {
      event.preventDefault();
      const result = readRepresentations(data, [options.codec]);
      return result.ok ? { ok: true, type: "structured", payload: result.payload } : result;
    }
    if (options.files && data.files && data.files.length > 0) {
      event.preventDefault();
      return { ok: true, type: "files", files: Array.from(data.files) };
    }
    if (options.html === "images" && Array.from(data.types).includes("text/html")) {
      let content: WebHTMLClipboardContent | null;
      try { content = parseWebClipboardHTML(data.getData("text/html")); }
      catch (error) { event.preventDefault(); return failure("clipboard.invalid", errorMessage(error)); }
      if (content?.parts.some((part) => part.type === "image")) {
        event.preventDefault();
        return { ok: true, type: "html", content };
      }
    }
    if (options.text && Array.from(data.types).includes("text/plain")) {
      event.preventDefault();
      const text = data.getData("text/plain");
      return text.length > 0 ? { ok: true, type: "text", text } : failure("clipboard.empty");
    }
    return failure("clipboard.empty");
  } catch (error) { return failure("clipboard.unavailable", errorMessage(error)); }
}

export interface WebClipboardCodec<Payload extends WebClipboardPayload> {
  readonly mimeType: Payload["type"];
  encode(payload: Payload): string;
  decode(serialized: string): Payload | null;
}

export interface WebJSONClipboardFormat<Payload extends WebClipboardPayload> {
  readonly mimeType: Payload["type"];
  parse(value: unknown): Payload | null;
}

export interface WebClipboardRepresentation<Payload extends WebClipboardPayload> {
  readonly mimeType: string;
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

export interface WebClipboardBindingOptions<
  Payload extends WebClipboardPayload,
  EditingResult extends { readonly ok: boolean; readonly code?: string; readonly reason?: string },
> {
  readonly codec: WebClipboardCodec<Payload>;
  readonly representations?: ReadonlyArray<WebClipboardRepresentation<Payload>>;
  readonly read: () => Payload | null;
  readonly cut?: (payload: Payload) => EditingResult | null;
  readonly paste: (payload: Payload) => EditingResult;
}

export interface WebClipboardSurface<Payload extends WebClipboardPayload, EditingResult> {
  readonly onCopy: (event: WebClipboardEvent) => WebClipboardResult<Payload, EditingResult> | null;
  readonly onCut: (event: WebClipboardEvent) => WebClipboardResult<Payload, EditingResult> | null;
  readonly onPaste: (event: WebClipboardEvent) => WebClipboardResult<Payload, EditingResult> | null;
}

export type WebClipboardWriteResult =
  | { readonly ok: true }
  | {
    readonly ok: false;
    readonly code: "clipboard.unsupported" | "clipboard.write-failed";
    readonly reason?: string;
  };

export interface WebClipboardTextWriter {
  writeText(text: string): Promise<WebClipboardWriteResult>;
}

export interface WebClipboardTextPort {
  writeText(text: string): Promise<void>;
}

export function createWebClipboardTextWriter(options?: {
  readonly clipboard?: WebClipboardTextPort | null;
}): WebClipboardTextWriter {
  return {
    async writeText(text) {
      const clipboard = options?.clipboard === undefined
        ? (typeof navigator === "undefined" ? null : navigator.clipboard)
        : options.clipboard;
      if (clipboard === null || clipboard === undefined) {
        return { ok: false, code: "clipboard.unsupported" };
      }
      try {
        await clipboard.writeText(text);
        return { ok: true };
      } catch (error) {
        return { ok: false, code: "clipboard.write-failed", reason: errorMessage(error) };
      }
    },
  };
}

export const documentClipboardCodec = createWebJSONClipboardRepresentation(documentClipboardFormat);

export const sheetClipboardCodec = createWebJSONClipboardRepresentation(sheetClipboardFormat);

export const orderClipboardCodec = createWebJSONClipboardRepresentation(orderClipboardFormat);

export const objectClipboardCodec = createWebJSONClipboardRepresentation(objectClipboardFormat);

export const treeClipboardCodec = createWebJSONClipboardRepresentation(treeClipboardFormat);

export const databaseClipboardCodec = createWebJSONClipboardRepresentation(databaseClipboardFormat);

export function createWebJSONClipboardRepresentation<Payload extends WebClipboardPayload>(
  format: WebJSONClipboardFormat<Payload>,
): WebClipboardCodec<Payload> {
  return {
    mimeType: format.mimeType,
    encode: (payload) => JSON.stringify(payload),
    decode(serialized) {
      if (serialized.length === 0) return null;
      return format.parse(JSON.parse(serialized));
    },
  };
}

export function createWebClipboardBinding<
  Payload extends WebClipboardPayload,
  EditingResult extends { readonly ok: boolean; readonly code?: string; readonly reason?: string },
>(options: WebClipboardBindingOptions<Payload, EditingResult>): WebClipboardBinding<Payload, EditingResult> {
  function write(event: WebClipboardEvent):
    | { readonly ok: true; readonly payload: Payload }
    | Extract<WebClipboardResult<never, never>, { readonly ok: false }> {
    const data = event.clipboardData;
    if (data === null) return failure("clipboard.unavailable");
    try {
      const payload = options.read();
      if (payload === null) return failure("clipboard.empty");
      if (options.representations === undefined) {
        data.setData(options.codec.mimeType, options.codec.encode(payload));
        data.setData("text/plain", payload.text);
      } else {
        for (const representation of options.representations) {
          data.setData(representation.mimeType, representation.encode(payload));
        }
      }
      return { ok: true, payload };
    } catch (error) {
      return failure("clipboard.unavailable", errorMessage(error));
    }
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
      // The binding owns this cut, including write failure. Never allow native
      // fallback deletion after a refused/partial structured clipboard write.
      if (!event.defaultPrevented) event.preventDefault();
      const written = write(event);
      if (!written.ok) return written;
      const result = options.cut(written.payload);
      if (result === null) return failure("editing.rejected", "clipboard.empty");
      if (!result.ok) return failure("editing.rejected", result.reason ?? result.code);
      return { ok: true, operation: "cut", payload: written.payload, result };
    },
    paste(event) {
      const data = event.clipboardData;
      if (data === null) return failure("clipboard.unavailable");
      const representations: ReadonlyArray<WebClipboardRepresentation<Payload>> = options.representations ?? [{
        mimeType: options.codec.mimeType,
        encode: options.codec.encode,
        decode: options.codec.decode,
      }];
      const captured = readRepresentations(data, representations);
      if (!captured.ok) return captured;
      const { payload } = captured;
      event.preventDefault();
      const result = options.paste(payload);
      if (!result.ok) return failure("editing.rejected", result.reason ?? result.code);
      return { ok: true, operation: "paste", payload, result };
    },
  };
}

export function createWebClipboardSurface<
  Payload extends WebClipboardPayload,
  EditingResult extends { readonly ok: boolean; readonly code?: string; readonly reason?: string },
>(options: WebClipboardBindingOptions<Payload, EditingResult> & {
  readonly onResult: (result: WebClipboardResult<Payload, EditingResult>) => void;
}): WebClipboardSurface<Payload, EditingResult> {
  const binding = createWebClipboardBinding(options);

  function handle(
    operation: keyof WebClipboardBinding<Payload, EditingResult>,
    event: WebClipboardEvent,
  ): WebClipboardResult<Payload, EditingResult> | null {
    const execute = () => {
      const result = binding[operation](event);
      options.onResult(result);
      return result;
    };
    // DOM events carry their editing root. Target-less programmatic calls
    // retain the binding precondition: the caller already owns the event.
    if (event.currentTarget !== undefined || event.target !== undefined) {
      return event.currentTarget === null || event.currentTarget === undefined
        ? null : routeWebClipboardEvent(event.currentTarget, event, operation, execute);
    }
    return event.defaultPrevented ? null : execute();
  }

  return {
    onCopy: (event) => handle("copy", event),
    onCut: (event) => handle("cut", event),
    onPaste: (event) => handle("paste", event),
  };
}

function readRepresentations<Payload extends WebClipboardPayload>(data: WebClipboardData, representations: ReadonlyArray<WebClipboardRepresentation<Payload>>):
  | { readonly ok: true; readonly payload: Payload }
  | Extract<WebClipboardResult<never, never>, { readonly ok: false }> {
  let matched = false;
  let invalidReason: string | undefined;
  for (const representation of representations) {
    if (!Array.from(data.types).includes(representation.mimeType)) continue;
    matched = true;
    try {
      const payload = representation.decode(data.getData(representation.mimeType));
      if (payload !== null) return { ok: true, payload };
    } catch (error) { invalidReason = errorMessage(error); }
  }
  return failure(matched ? "clipboard.invalid" : "clipboard.empty", invalidReason);
}

function failure(
  code: Extract<WebClipboardResult<never, never>, { readonly ok: false }>["code"],
  reason?: string,
): Extract<WebClipboardResult<never, never>, { readonly ok: false }> {
  return reason === undefined ? { ok: false, code } : { ok: false, code, reason };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
