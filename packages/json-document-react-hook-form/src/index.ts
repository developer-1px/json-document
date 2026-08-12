import { useCallback, useEffect, useRef, useState, type BaseSyntheticEvent } from "react";
import type { JSONValue } from "@interactive-os/json-document";
import type {
  EditingResult,
  EditingSession,
} from "@interactive-os/json-document-editing";
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
  readonly result: EditingResult<Selection> | null;
  readonly submit: (event?: BaseSyntheticEvent) => Promise<void>;
}

export function useJSONDocumentForm<
  Values extends FieldValues,
  Selection extends JSONValue,
>(
  session: EditingSession<Selection>,
  options: UseJSONDocumentFormOptions<Values> = {},
): JSONDocumentFormBinding<Values, Selection> {
  const snapshot = useEditingSnapshot(session);
  const form = useForm<Values, unknown, Values>({
    ...options.form,
    defaultValues: cloneFormValues<Values>(snapshot.value) as DefaultValues<Values>,
  });
  const [result, setResult] = useState<EditingResult<Selection> | null>(null);
  const canonicalValue = useRef(snapshot.value);
  const canonicalError = useRef<FieldPath<Values> | `root.${string}` | null>(null);

  useEffect(() => {
    if (canonicalValue.current === snapshot.value) return;
    canonicalValue.current = snapshot.value;
    canonicalError.current = null;
    form.reset(cloneFormValues<Values>(snapshot.value));
  }, [form, snapshot.value]);

  const commit = useCallback((values: Values) => {
    if (canonicalError.current !== null) form.clearErrors(canonicalError.current);
    const next = cloneJSON(values);
    const committed = session.apply({
      operations: [{ op: "replace", path: "", value: next }],
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
    result,
    submit: form.handleSubmit(commit),
  };
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
