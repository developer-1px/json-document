import {
  applyPatch,
  buildPointer,
  tryParsePointer,
  type JSONDocument,
  type JSONPatchOperation,
  type Pointer,
} from "@interactive-os/json-document";
import {
  createIdResolver,
} from "@interactive-os/json-document-id-resolver";

import type {
  StableIdReplaceInput,
  StableIdRebaseResult,
} from "./types.js";

const PERMISSIVE_JSON_SCHEMA = {
  safeParse: (input: unknown) => ({ success: true as const, data: input }),
};

export function rebaseStableChange<TDocument>(
  doc: JSONDocument<TDocument>,
  input: StableIdReplaceInput,
): StableIdRebaseResult {
  const relativePath = canonicalPointer(input.relativePath);
  if (relativePath === null) {
    return {
      ok: false,
      code: "invalid_change",
      reason: `invalid relative pointer: ${input.relativePath}`,
      pointer: input.relativePath,
    };
  }
  if (relativePath === "") {
    return {
      ok: false,
      code: "invalid_change",
      reason: "stable entity root replacement is not supported",
      pointer: relativePath,
    };
  }

  const scopeNames = new Set<string>();
  for (const candidate of input.scopes) {
    if (scopeNames.has(candidate.scope)) {
      return {
        ok: false,
        code: "invalid_change",
        reason: `stable id scope must be registered once: ${candidate.scope}`,
      };
    }
    scopeNames.add(candidate.scope);
  }
  const scope = input.scopes.find((candidate) => {
    return candidate.scope === input.target.scope;
  });

  const ids = createIdResolver(doc, { scopes: input.scopes });
  const resolved = ids.resolve(input.target.scope, input.target.id);
  if (!resolved.ok) {
    return {
      ok: false,
      code: "identity_resolution_failed",
      reason: resolved.reason,
      identityCode: resolved.code,
      scope: input.target.scope,
      id: input.target.id,
      ...(resolved.pointers === undefined
        ? {}
        : { pointers: [...resolved.pointers] }),
    };
  }

  const targetPointer = canonicalPointer(resolved.pointer);
  if (targetPointer === null) {
    return {
      ok: false,
      code: "identity_resolution_failed",
      reason: `id resolver returned an invalid pointer: ${resolved.pointer}`,
      identityCode: "invalid_pointer",
      scope: input.target.scope,
      id: input.target.id,
    };
  }
  const target = doc.at(targetPointer);
  if (!target.ok) {
    return {
      ok: false,
      code: "identity_resolution_failed",
      reason: target.reason ?? `stable target does not exist: ${targetPointer}`,
      identityCode: "target_not_found",
      scope: input.target.scope,
      id: input.target.id,
    };
  }

  const changePointer = joinPointers(targetPointer, relativePath);
  let selectionAfter: Pointer | undefined;
  if (input.relativeSelectionAfter !== undefined) {
    const relativeSelection = canonicalPointer(input.relativeSelectionAfter);
    if (relativeSelection === null) {
      return {
        ok: false,
        code: "invalid_change",
        reason: `invalid relative selection pointer: ${input.relativeSelectionAfter}`,
        pointer: input.relativeSelectionAfter,
      };
    }
    selectionAfter = joinPointers(targetPointer, relativeSelection);
  }

  const operations: JSONPatchOperation[] = [
    { op: "test", path: targetPointer, value: cloneJson(target.value) },
    { op: "test", path: changePointer, value: input.expected },
    { op: "replace", path: changePointer, value: input.value },
  ];
  const capability = doc.canPatch(operations);
  if (!capability.ok) {
    if (capability.code === "test_failed" || capability.code === "path_not_found") {
      return {
        ok: false,
        code: "target_changed",
        reason: capability.reason ?? `stable target changed: ${changePointer}`,
        pointer: changePointer,
        capability: cloneJson(capability),
      };
    }
    return {
      ok: false,
      code: "change_patch_failed",
      reason: capability.reason ?? `stable change patch failed: ${changePointer}`,
      capability: cloneJson(capability),
    };
  }

  const applied = applyPatch(
    PERMISSIVE_JSON_SCHEMA as Parameters<typeof applyPatch>[0],
    doc.value,
    operations,
  );
  if (!applied.result.ok) {
    if (
      applied.result.code === "test_failed"
      || applied.result.code === "path_not_found"
    ) {
      return {
        ok: false,
        code: "target_changed",
        reason: applied.result.reason ?? `stable target changed: ${changePointer}`,
        pointer: changePointer,
        capability: cloneJson(applied.result),
      };
    }
    return {
      ok: false,
      code: "change_patch_failed",
      reason: applied.result.reason ?? `stable change patch failed: ${changePointer}`,
      capability: cloneJson(applied.result),
    };
  }

  const finalTarget = readPointerValue(applied.state, targetPointer);
  let finalId: string | null | undefined;
  try {
    finalId = scope?.readId(
      finalTarget.ok ? finalTarget.value : undefined,
      targetPointer,
    );
  } catch {
    finalId = undefined;
  }
  if (!finalTarget.ok || scope === undefined || finalId !== input.target.id) {
    return {
      ok: false,
      code: "identity_changed",
      reason: `stable change would alter identity ${input.target.scope}:${input.target.id}`,
      scope: input.target.scope,
      id: input.target.id,
      pointer: targetPointer,
    };
  }

  const diagnostics = [];
  if (selectionAfter !== undefined) {
    if (!readPointerValue(applied.state, selectionAfter).ok) {
      diagnostics.push({
        code: "selection_dropped" as const,
        reason: "stable selection target will not exist after the change",
        pointer: selectionAfter,
      });
      selectionAfter = undefined;
    }
  }

  return {
    ok: true,
    operations: operations.map((operation) => cloneJson(operation)),
    ...(selectionAfter === undefined ? {} : { selectionAfter }),
    diagnostics,
  };
}

function canonicalPointer(pointer: Pointer): Pointer | null {
  const segments = tryParsePointer(pointer);
  return segments === null ? null : buildPointer(segments);
}

function joinPointers(parent: Pointer, relative: Pointer): Pointer {
  return buildPointer([
    ...tryParsePointer(parent)!,
    ...tryParsePointer(relative)!,
  ]);
}

function cloneJson<T>(value: T): T {
  if (value === undefined) return undefined as T;
  return JSON.parse(JSON.stringify(value)) as T;
}

function readPointerValue(
  state: unknown,
  pointer: Pointer,
): { ok: true; value: unknown } | { ok: false } {
  let current = state;
  for (const segment of tryParsePointer(pointer) ?? []) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(segment)) return { ok: false };
      const index = Number(segment);
      if (index >= current.length) return { ok: false };
      current = current[index];
      continue;
    }
    if (
      current === null
      || typeof current !== "object"
      || !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return { ok: false };
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return { ok: true, value: current };
}
