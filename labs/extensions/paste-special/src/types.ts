import type { JSONCapabilityResult, JSONDocumentEditResult, JSONDocumentInsertOptions, JSONDocumentPasteTarget, Pointer } from "@interactive-os/json-document";

export type PasteSpecialOptions = JSONDocumentInsertOptions;

export type PasteSpecialErrorCode =
  | "adapter_failed"
  | "disabled"
  | "execution_failed"
  | "unsupported_payload";

export interface PasteSpecialInput {
  payload: unknown;
  target: JSONDocumentPasteTarget;
  data?: Readonly<Record<string, unknown>>;
}

export interface PasteSpecialAdapterInput {
  payload: unknown;
  target: JSONDocumentPasteTarget;
  data?: Readonly<Record<string, unknown>>;
}

export interface PasteSpecialAdaptedPayload {
  ok: true;
  payload: unknown;
  options?: PasteSpecialOptions;
  diagnostics?: ReadonlyArray<PasteSpecialDiagnostic>;
}

export interface PasteSpecialDiagnostic {
  code: string;
  reason: string;
  pointer?: Pointer;
}

export interface PasteSpecialAdapterError {
  ok: false;
  code: "adapter_failed" | "unsupported_payload";
  reason: string;
  pointer?: Pointer;
  diagnostics?: ReadonlyArray<PasteSpecialDiagnostic>;
}

export type PasteSpecialAdapterResult =
  | PasteSpecialAdaptedPayload
  | PasteSpecialAdapterError;

export interface PasteSpecialAdapter {
  adapt(input: PasteSpecialAdapterInput): PasteSpecialAdapterResult;
}

export interface PasteSpecialPlan {
  ok: true;
  input: PasteSpecialInput;
  target: JSONDocumentPasteTarget;
  payload: unknown;
  options: PasteSpecialOptions;
  capability: JSONCapabilityResult;
  diagnostics: ReadonlyArray<PasteSpecialDiagnostic>;
}

export interface PasteSpecialError {
  ok: false;
  code: PasteSpecialErrorCode;
  reason: string;
  target?: JSONDocumentPasteTarget;
  pointer?: Pointer;
  diagnostics?: ReadonlyArray<PasteSpecialDiagnostic>;
  capability?: Exclude<JSONCapabilityResult, { ok: true }>;
  result?: Exclude<JSONDocumentEditResult, { ok: true }>;
}

export type PasteSpecialPlanResult =
  | PasteSpecialPlan
  | PasteSpecialError;

export type PasteSpecialApplyResult<TDocument> =
  | {
      ok: true;
      input: PasteSpecialInput;
      target: JSONDocumentPasteTarget;
      payload: unknown;
      options: PasteSpecialOptions;
      result: JSONDocumentEditResult;
      diagnostics: ReadonlyArray<PasteSpecialDiagnostic>;
    }
  | PasteSpecialError;

export interface PasteSpecial<TDocument> {
  canPaste(input: PasteSpecialInput): PasteSpecialPlanResult;
  paste(input: PasteSpecialInput): PasteSpecialApplyResult<TDocument>;
}
