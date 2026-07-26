import type {
  JSONCapabilityResult,
  JSONDocumentEditResult,
  JSONDocumentInsertOptions,
  JSONDocumentInsertTarget,
  Pointer,
} from "@interactive-os/json-document/session";

export type SnippetInsertOptions = JSONDocumentInsertOptions;

export interface Snippet {
  id: string;
  payload: unknown;
  label?: string;
  options?: SnippetInsertOptions;
}

export interface SnippetSummary {
  id: string;
  label?: string;
}

export type SnippetErrorCode =
  | "snippet_not_found"
  | "disabled"
  | "execution_failed";

export interface SnippetError {
  ok: false;
  code: SnippetErrorCode;
  reason: string;
  id?: string;
  target?: JSONDocumentInsertTarget;
  pointer?: Pointer;
  capability?: Exclude<JSONCapabilityResult, { ok: true }>;
  result?: Exclude<JSONDocumentEditResult, { ok: true }>;
}

export interface SnippetPlan {
  ok: true;
  id: string;
  target: JSONDocumentInsertTarget;
  capability: { ok: true };
}

export type SnippetPlanResult =
  | SnippetPlan
  | SnippetError;

export type SnippetInsertResult<TDocument> =
  | {
    ok: true;
    id: string;
    target: JSONDocumentInsertTarget;
    result: JSONDocumentEditResult;
  }
  | SnippetError;

export interface Snippets<TDocument> {
  list(): ReadonlyArray<SnippetSummary>;
  get(id: string): Snippet | null;
  canInsert(id: string, target: JSONDocumentInsertTarget, options?: SnippetInsertOptions): SnippetPlanResult;
  insert(id: string, target: JSONDocumentInsertTarget, options?: SnippetInsertOptions): SnippetInsertResult<TDocument>;
}
