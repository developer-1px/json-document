import { useCallback, useEffect, useMemo, useRef, useState, type BaseSyntheticEvent } from "react";
import {
  buildPointer,
  parsePointer,
  type JSONAppliedChange,
  type JSONDocument,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";
import type {
  EditingResult,
  EditingSession,
  EditingSnapshot,
} from "@interactive-os/json-document-editing";
import { createEditingSession } from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import {
  useForm,
  type FieldPath,
  type FieldValues,
  type DefaultValues,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";

export interface CanonicalFormFailure {
  readonly ok: false;
  readonly code: string;
  readonly reason?: string;
  readonly pointer?: string;
}

export interface UseJSONDocumentFormOptions<Values extends FieldValues> {
  readonly form?: Omit<UseFormProps<Values>, "defaultValues" | "values">;
  readonly errorName?: (failure: CanonicalFormFailure) => FieldPath<Values> | `root.${string}`;
  readonly origin?: string;
}

export interface JSONDocumentFormBinding<
  Values extends FieldValues,
  Selection extends JSONValue,
> {
  readonly form: UseFormReturn<Values>;
  readonly snapshot: EditingSnapshot<Selection>;
  readonly result: EditingResult<Selection> | null;
  readonly submit: (event?: BaseSyntheticEvent) => Promise<void>;
  readonly undo: () => EditingResult<Selection>;
  readonly redo: () => EditingResult<Selection>;
}

export type ReactHookFormConnector<Values extends FieldValues> =
  JSONDocumentFormBinding<Values, null>;
export type ReactHookFormConnectorOptions<Values extends FieldValues> =
  UseJSONDocumentFormOptions<Values>;

/** Official React Hook Form Connector entry point. */
export function useReactHookFormConnector<Values extends FieldValues>(
  document: JSONDocument,
  options: ReactHookFormConnectorOptions<Values> = {},
): ReactHookFormConnector<Values> {
  const session = useMemo(() => createEditingSession({
    document,
    selection: null,
  }), [document]);
  return useJSONDocumentForm<Values, null>(session, options, document);
}

export function useJSONDocumentForm<
  Values extends FieldValues,
  Selection extends JSONValue,
>(
  session: EditingSession<Selection>,
  options: UseJSONDocumentFormOptions<Values> = {},
  changeSource?: Pick<JSONDocument, "subscribe" | "at">,
): JSONDocumentFormBinding<Values, Selection> {
  const snapshot = useEditingSnapshot(session);
  const form = useForm<Values, unknown, Values>({
    ...options.form,
    defaultValues: cloneFormValues<Values>(snapshot.value) as DefaultValues<Values>,
  });
  const [result, setResult] = useState<EditingResult<Selection> | null>(null);
  const canonicalValue = useRef(snapshot.value);
  const canonicalError = useRef<FieldPath<Values> | `root.${string}` | null>(null);
  const pendingChanges = useRef<JSONAppliedChange[]>([]);

  useEffect(() => changeSource?.subscribe((change) => {
    pendingChanges.current.push(change);
  }), [changeSource]);

  useEffect(() => {
    if (canonicalValue.current === snapshot.value) return;
    canonicalValue.current = snapshot.value;
    canonicalError.current = null;
    const changes = pendingChanges.current;
    pendingChanges.current = [];
    const change = changes.length === 0 ? null : {
      applied: changes.flatMap((candidate) => candidate.applied),
    };
    if (changeSource === undefined || change === null || !syncAppliedChange(form, changeSource, change)) {
      form.reset(cloneFormValues<Values>(snapshot.value));
    }
  }, [changeSource, form, snapshot.value]);

  const commit = useCallback((values: Values) => {
    if (canonicalError.current !== null) form.clearErrors(canonicalError.current);
    const next = values as JSONValue;
    const operations = diffJSON(canonicalValue.current, next);
    const committed = session.apply({
      operations,
      selectionAfter: session.snapshot.selection,
      origin: options.origin ?? "form.submit",
    });
    setResult(committed);
    if (committed.ok) {
      canonicalError.current = null;
      return;
    }

    const failure = canonicalFailure(committed);
    const name = options.errorName?.(failure) ?? "root.canonical";
    canonicalError.current = name;
    form.setError(name, {
      type: failure.code,
      message: failure.reason ?? failure.code,
    });
  }, [form, options.errorName, options.origin, session]);

  return {
    form,
    snapshot,
    result,
    submit: form.handleSubmit(commit),
    undo: () => session.undo(),
    redo: () => session.redo(),
  };
}

function syncAppliedChange<Values extends FieldValues>(
  form: UseFormReturn<Values>,
  source: Pick<JSONDocument, "at">,
  change: JSONAppliedChange,
): boolean {
  const pointers = syncPointers(change.applied);
  if (pointers === null) return false;
  for (const pointer of pointers) {
    const result = source.at(pointer);
    if (!result.ok) return false;
    const name = fieldPath(pointer);
    if (name === null) return false;
    const value = cloneJSON(result.value) as never;
    form.setValue(name as FieldPath<Values>, value, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
    form.resetField(name as FieldPath<Values>, { defaultValue: value });
  }
  return true;
}

function syncPointers(operations: ReadonlyArray<JSONPatchOperation>): string[] | null {
  const pointers: string[] = [];
  for (const operation of operations) {
    if (operation.op === "test") continue;
    if (operation.path === "") return null;
    const segments = parsePointer(operation.path);
    const structural = operation.op === "add" || operation.op === "remove"
      || operation.op === "move" || operation.op === "copy";
    if (structural) segments.pop();
    const pointer = buildPointer(segments);
    if (pointer === "") return null;
    pointers.push(pointer);
    if ((operation.op === "move" || operation.op === "copy") && operation.from !== "") {
      const from = parsePointer(operation.from);
      from.pop();
      if (from.length === 0) return null;
      pointers.push(buildPointer(from));
    }
  }
  return pointers.filter((pointer, index) => (
    pointers.indexOf(pointer) === index
    && !pointers.some((other) => other !== pointer && pointer.startsWith(`${other}/`))
  ));
}

function fieldPath(pointer: string): string | null {
  const segments = parsePointer(pointer);
  if (segments.length === 0 || segments.some((segment) => (
    !/^[$A-Z_a-z][$\w]*$/.test(segment) && !/^\d+$/.test(segment)
  ))) return null;
  return segments.join(".");
}

function diffJSON(current: JSONValue, next: JSONValue, segments: ReadonlyArray<string> = []): JSONPatchOperation[] {
  if (Object.is(current, next)) return [];
  if (Array.isArray(current) && Array.isArray(next)) {
    if (current.length !== next.length) {
      return [{ op: "replace", path: buildPointer(segments), value: cloneJSON(next) }];
    }
    return current.flatMap((value, index) => diffJSON(value, next[index]!, [...segments, String(index)]));
  }
  if (isRecord(current) && isRecord(next)) {
    const operations: JSONPatchOperation[] = [];
    for (const key of Object.keys(current)) {
      if (!(key in next)) operations.push({ op: "remove", path: buildPointer([...segments, key]) });
    }
    for (const [key, value] of Object.entries(next)) {
      operations.push(...(key in current
        ? diffJSON(current[key]!, value, [...segments, key])
        : [{ op: "add" as const, path: buildPointer([...segments, key]), value: cloneJSON(value) }]));
    }
    return operations;
  }
  return [{ op: "replace", path: buildPointer(segments), value: cloneJSON(next) }];
}

function cloneFormValues<Values extends FieldValues>(value: JSONValue): Values {
  if (!isRecord(value)) {
    throw new TypeError("React Hook Form Connector requires an object-shaped canonical value.");
  }
  return cloneJSON(value) as Values;
}

function cloneJSON(value: unknown): JSONValue {
  return JSON.parse(JSON.stringify(value)) as JSONValue;
}

function canonicalFailure<Selection extends JSONValue>(
  result: Extract<EditingResult<Selection>, { readonly ok: false }>,
): CanonicalFormFailure {
  const pointer = "pointer" in result && typeof result.pointer === "string"
    ? result.pointer
    : undefined;
  return {
    ok: false,
    code: result.code,
    ...(result.reason === undefined ? {} : { reason: result.reason }),
    ...(pointer === undefined ? {} : { pointer }),
  };
}

function isRecord(value: JSONValue): value is { readonly [key: string]: JSONValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
