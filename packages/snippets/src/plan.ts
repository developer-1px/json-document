import type {
  JSONDocument,
  JSONDocumentInsertTarget,
} from "@interactive-os/json-document";

import {
  disabled,
} from "./errors.js";
import {
  insertOptions,
} from "./options.js";
import type {
  Snippet,
  SnippetInsertOptions,
  SnippetPlanResult,
} from "./types.js";

export function canInsertSnippet<TDocument>(
  doc: JSONDocument<TDocument>,
  snippet: Snippet,
  target: JSONDocumentInsertTarget,
  options?: SnippetInsertOptions,
): SnippetPlanResult {
  const capability = doc.canInsert(target, snippet.payload, insertOptions(snippet, options));
  if (!capability.ok) return disabled(snippet.id, target, capability);

  return {
    ok: true,
    id: snippet.id,
    target,
    capability,
  };
}
