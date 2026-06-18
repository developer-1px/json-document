import type {
  JSONDocumentInsertOptions,
} from "@interactive-os/json-document";

import {
  copyOptions,
} from "./copy.js";
import type {
  Snippet,
  SnippetInsertOptions,
} from "./types.js";

export function insertOptions(
  snippet: Snippet,
  options?: SnippetInsertOptions,
): JSONDocumentInsertOptions {
  return {
    ...copyOptions(snippet.options),
    ...copyOptions(options),
  };
}
