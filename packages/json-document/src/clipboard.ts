// Advanced clipboard entrypoint.
// The core document facade exposes this capability as doc.copy/cut/paste and doc.clipboard.

export type {
  ClipboardCopyError,
  ClipboardCopyOk,
  ClipboardCopyOptions,
  ClipboardCopyResult,
  ClipboardCutError,
  ClipboardCutOk,
  ClipboardCutOptions,
  ClipboardCutResult,
  ClipboardEmpty,
  ClipboardMutationOk,
  ClipboardPasteDiscriminatorMismatch,
  ClipboardPasteError,
  ClipboardPasteResult,
  ClipboardReadOk,
  ClipboardReadOptions,
  ClipboardReadResult,
  ClipboardSource,
  ClipboardState,
  ClipboardWriteOptions,
  JSONDocumentPasteOptions,
  JSONDocumentPasteTarget,
} from "./application/document/clipboard/contract.js";
