// foundation/jsonpath — RFC 9535 JSONPath. 자체 구현 (외부 의존 0).
// 1차 구현 범위:
//   ✓ $ root, .name / ['name'] / [n] / [start:end:step] / *
//   ✓ .. descendant
//   ✓ filter [?<expr>] — comparisons (==/!=/</<=/>/>=) + logical (&&/||/!) + exists
//   ✓ RFC 9535 function extensions — length/count/match/search/value
//
// API: query(query, root) → Pointer[]
// RFC 9535 JSONPath 결과를 RFC 6901 Pointer 배열로 환원한다.

import { parse as parseJsonPath } from "./parse.js";
import { evaluate, matchPointers } from "./evaluate.js";
import { matchPointersForSimpleQuery } from "./simple.js";
import type { Pointer } from "../pointer/core.js";
import type { Query } from "./ast.js";
export { JSONPathSyntaxError } from "./tokenize.js";

const QUERY_CACHE_LIMIT = 128;
const queryCache = new Map<string, Query>();
let lastQueryText: string | undefined;
let lastQueryAst: Query | undefined;

/** shorthand: query string + root → Pointer[]. */
export function query(jsonpath: string, root: unknown): Pointer[] {
  const ast = cachedParse(jsonpath);
  const simplePointers = matchPointersForSimpleQuery(ast, root);
  if (simplePointers !== null) return simplePointers;
  return matchPointers(evaluate(ast, root));
}

function cachedParse(jsonpath: string): Query {
  if (jsonpath === lastQueryText && lastQueryAst !== undefined) return lastQueryAst;

  const cached = queryCache.get(jsonpath);
  if (cached !== undefined) {
    queryCache.delete(jsonpath);
    queryCache.set(jsonpath, cached);
    lastQueryText = jsonpath;
    lastQueryAst = cached;
    return cached;
  }

  const ast = parseJsonPath(jsonpath);
  queryCache.set(jsonpath, ast);
  if (queryCache.size > QUERY_CACHE_LIMIT) {
    const oldest = queryCache.keys().next().value;
    if (oldest !== undefined) queryCache.delete(oldest);
  }
  lastQueryText = jsonpath;
  lastQueryAst = ast;
  return ast;
}
