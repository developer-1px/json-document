import type {
  CapabilityResult,
  DocumentRuntime,
  DocumentRuntimeOptions,
} from "../../domain/document/index.js";

export type JSONDocumentOptions = DocumentRuntimeOptions;
export type JSONCapabilityResult = CapabilityResult;
export type JSONDocument<T> = DocumentRuntime<T>;
