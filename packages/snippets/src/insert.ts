import type {
  JSONDocument,
  JSONDocumentInsertTarget,
} from "@interactive-os/json-document";

import {
  copyPayload,
} from "./copy.js";
import {
  executionFailed,
} from "./errors.js";
import {
  insertOptions,
} from "./options.js";
import {
  canInsertSnippet,
} from "./plan.js";
import type {
  Snippet,
  SnippetInsertOptions,
  SnippetInsertResult,
} from "./types.js";

export function insertSnippet<TDocument>(
  doc: JSONDocument<TDocument>,
  snippet: Snippet,
  target: JSONDocumentInsertTarget,
  options?: SnippetInsertOptions,
): SnippetInsertResult<TDocument> {
  const plan = canInsertSnippet(doc, snippet, target, options);
  if (!plan.ok) return plan;

  const result = doc.insert(target, copyPayload(snippet.payload), insertOptions(snippet, options));
  if (!result.ok) return executionFailed(snippet.id, target, result);

  return {
    ok: true,
    id: snippet.id,
    target,
    result,
  };
}
