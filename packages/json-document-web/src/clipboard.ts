import {
  databaseClipboardFormat,
  documentClipboardFormat,
  objectClipboardFormat,
  orderClipboardFormat,
  sheetClipboardFormat,
  treeClipboardFormat,
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
  readonly onCopy: (event: WebClipboardEvent) => WebClipboardResult<Payload, EditingResult>;
  readonly onCut: (event: WebClipboardEvent) => WebClipboardResult<Payload, EditingResult>;
  readonly onPaste: (event: WebClipboardEvent) => WebClipboardResult<Payload, EditingResult>;
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
    const payload = options.read();
    if (payload === null) return failure("clipboard.empty");
    try {
      if (options.representations === undefined) {
        data.setData(options.codec.mimeType, options.codec.encode(payload));
        data.setData("text/plain", payload.text);
      } else {
        for (const representation of options.representations) {
          data.setData(representation.mimeType, representation.encode(payload));
        }
      }
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
      if (result === null) return failure("editing.rejected", "clipboard.empty");
      if (!result.ok) return failure("editing.rejected", result.reason ?? result.code);
      event.preventDefault();
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
      let payload: Payload | null = null;
      let matched = false;
      let invalidReason: string | undefined;
      for (const representation of representations) {
        if (!Array.from(data.types).includes(representation.mimeType)) continue;
        matched = true;
        try {
          payload = representation.decode(data.getData(representation.mimeType));
        } catch (error) {
          invalidReason = errorMessage(error);
        }
        if (payload !== null) break;
      }
      if (!matched) return failure("clipboard.empty");
      if (payload === null) return failure("clipboard.invalid", invalidReason);
      const result = options.paste(payload);
      if (!result.ok) return failure("editing.rejected", result.reason ?? result.code);
      event.preventDefault();
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
  ): WebClipboardResult<Payload, EditingResult> {
    const result = binding[operation](event);
    options.onResult(result);
    return result;
  }

  return {
    onCopy: (event) => handle("copy", event),
    onCut: (event) => handle("cut", event),
    onPaste: (event) => handle("paste", event),
  };
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
