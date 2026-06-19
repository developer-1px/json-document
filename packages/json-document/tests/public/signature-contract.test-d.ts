// signature-contract.test-d.ts — public API call shape fixture.

import * as z from "zod";
import {
  applyOperation,
  applyPatch,
  applyPatchToTrustedState,
  createJSONDocument,
  type ClipboardCopyError,
  type ClipboardCopyOptions,
  type ClipboardCopyResult,
  type ClipboardCutError,
  type ClipboardCutOptions,
  type ClipboardCutResult,
  type ClipboardEmpty,
  type ClipboardPasteError,
  type ClipboardPasteResult,
  type ClipboardReadResult,
  type ClipboardState,
  type EntriesResult,
  type JSONCapabilityResult,
  type JSONChangeMetadata,
  type JSONDocument,
  type JSONDocumentCommitOptions,
  type JSONDocumentDuplicateOptions,
  type JSONDocumentDuplicateResult,
  type JSONDocumentEditResult,
  type JSONDocumentHistory,
  type JSONDocumentInsertOptions,
  type JSONDocumentInsertTarget,
  type JSONDocumentMoveTarget,
  type JSONDocumentOptions,
  type JSONDocumentPasteOptions,
  type JSONDocumentPasteTarget,
  type JSONPatchInput,
  type JSONPatchOperation,
  type JSONResult,
  type Pointer,
  type QueryResult,
  type ReadResult,
  type SchemaState,
  type SelectionSource,
  type SelectionState,
} from "@interactive-os/json-document";
import { useJSONDocument } from "@interactive-os/json-document/react";

type Expect<T extends true> = T;
type IsAssignable<From, To> = From extends To ? true : false;
type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends
  (<T>() => T extends Right ? 1 : 2)
    ? true
    : false;

interface PublicSchemaLike {
  readonly _zod: {
    readonly input: unknown;
    readonly output: unknown;
  };
  safeParse(value: unknown): { success: true; data: unknown } | { success: false; error: unknown };
}

type PublicSchemaInput<S> =
  S extends { readonly _zod: { readonly input: infer Input } }
    ? Input
    : unknown;

type PublicSchemaOutput<S> =
  S extends { readonly _zod: { readonly output: infer Output } }
    ? Output
    : unknown;

type TrustedInitialDocumentOptions = JSONDocumentOptions & { trustedInitial: true };
type UntrustedInitialDocumentOptions = JSONDocumentOptions & { trustedInitial?: false | undefined };

interface ExpectedCreateJSONDocument {
  <S extends PublicSchemaLike>(
    schema: S,
    initial: PublicSchemaOutput<S>,
    options: TrustedInitialDocumentOptions,
  ): JSONDocument<PublicSchemaOutput<S>>;
  <S extends PublicSchemaLike>(
    schema: S,
    initial: PublicSchemaInput<S>,
    options?: UntrustedInitialDocumentOptions,
  ): JSONDocument<PublicSchemaOutput<S>>;
}

interface ExpectedUseJSONDocument {
  <S extends PublicSchemaLike>(
    schema: S,
    initial: PublicSchemaOutput<S>,
    options: TrustedInitialDocumentOptions,
  ): JSONDocument<PublicSchemaOutput<S>>;
  <S extends PublicSchemaLike>(
    schema: S,
    initial: PublicSchemaInput<S>,
    options?: UntrustedInitialDocumentOptions,
  ): JSONDocument<PublicSchemaOutput<S>>;
}

type FixtureSchema = z.ZodType<FixtureRow>;
type FixtureApplyResult = {
  state: FixtureRow;
  result: JSONResult;
  applied: ReadonlyArray<JSONPatchOperation>;
};

type ExpectedJSONResultCode =
  | "invalid_pointer"
  | "path_not_found"
  | "move_into_self"
  | "schema_violation"
  | "test_failed"
  | "not_serializable";

type ExpectedCapabilityErrorCode =
  | ExpectedJSONResultCode
  | "preflight_failed"
  | "discriminator_mismatch"
  | "rekey_failed"
  | "missing_new_key"
  | "key_conflict"
  | "empty_selection"
  | "empty_scope"
  | "empty_match"
  | "cursor_boundary"
  | "syntax_error"
  | "empty_stack"
  | "apply_failed"
  | "empty_clipboard"
  | "missing_length"
  | "multi_pointer_range"
  | "overlapping_ranges"
  | "not_string"
  | "point_not_in_order";

type ExpectedCopyErrorCode =
  | "empty_selection"
  | "invalid_pointer"
  | "path_not_found"
  | "not_serializable";

type ExpectedCutErrorCode = ExpectedCopyErrorCode | ExpectedJSONResultCode | "preflight_failed";
type ExpectedPasteErrorCode =
  | "empty_selection"
  | "not_serializable"
  | "rekey_failed"
  | ExpectedJSONResultCode
  | "preflight_failed";
type ExpectedDuplicateErrorCode =
  | "empty_selection"
  | "invalid_pointer"
  | "path_not_found"
  | "missing_new_key"
  | "key_conflict"
  | "not_serializable"
  | "rekey_failed"
  | ExpectedJSONResultCode
  | "preflight_failed";

interface ExpectedPatchHelpers {
  applyOperation(schema: FixtureSchema, state: FixtureRow, op: JSONPatchOperation): FixtureApplyResult;
  applyPatch(schema: FixtureSchema, state: FixtureRow, ops: ReadonlyArray<JSONPatchOperation>): FixtureApplyResult;
  applyPatchToTrustedState(schema: FixtureSchema, state: FixtureRow, ops: ReadonlyArray<JSONPatchOperation>): FixtureApplyResult;
}

interface ExpectedJSONDocument<T> {
  readonly value: T;
  readonly lastPatch: ReadonlyArray<JSONPatchOperation>;
  readonly selection: SelectionState | undefined;
  readonly history: JSONDocumentHistory;
  readonly clipboard: ClipboardState<T>;
  readonly schema: SchemaState;
  patch(operations: JSONPatchInput, metadata?: JSONChangeMetadata): JSONResult;
  commit(operations: ReadonlyArray<JSONPatchOperation>, options?: JSONDocumentCommitOptions): JSONResult;
  find(jsonpath: string): QueryResult;
  insert(target: JSONDocumentInsertTarget, value: unknown, options?: JSONDocumentInsertOptions): JSONDocumentEditResult;
  insert(value: unknown): JSONDocumentEditResult;
  replace(path: Pointer, value: unknown): JSONDocumentEditResult;
  replace(value: unknown): JSONDocumentEditResult;
  delete(source?: SelectionSource): JSONDocumentEditResult;
  move(source: Pointer, target: JSONDocumentMoveTarget): JSONDocumentEditResult;
  move(target: JSONDocumentMoveTarget): JSONDocumentEditResult;
  duplicate(source: Pointer, options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
  duplicate(options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
  copy(source?: SelectionSource, options?: ClipboardCopyOptions): ClipboardCopyResult;
  cut(source?: SelectionSource, options?: ClipboardCutOptions): ClipboardCutResult<T>;
  paste(target?: JSONDocumentPasteTarget, options?: JSONDocumentPasteOptions): ClipboardPasteResult<T>;
  undo(): JSONCapabilityResult;
  redo(): JSONCapabilityResult;
  load(value: unknown, options?: { preserveHistory?: boolean }): JSONResult;
  reset(value?: unknown): JSONResult;
  subscribe(listener: (
    applied: ReadonlyArray<JSONPatchOperation>,
    metadata?: JSONChangeMetadata,
  ) => void): () => void;
  at(path: Pointer): ReadResult;
  exists(path: Pointer): boolean;
  query(jsonpath: string): QueryResult;
  entries(path: Pointer): EntriesResult;
  canPatch(operations: JSONPatchInput): JSONCapabilityResult;
  canFind(jsonpath: string): JSONCapabilityResult;
  canInsert(value: unknown): JSONCapabilityResult;
  canInsert(target: JSONDocumentInsertTarget, value: unknown, options?: JSONDocumentInsertOptions): JSONCapabilityResult;
  canReplace(value: unknown): JSONCapabilityResult;
  canReplace(path: Pointer, value: unknown): JSONCapabilityResult;
  canDelete(source?: SelectionSource): JSONCapabilityResult;
  canMove(target: JSONDocumentMoveTarget): JSONCapabilityResult;
  canMove(source: Pointer, target: JSONDocumentMoveTarget): JSONCapabilityResult;
  canDuplicate(source: Pointer, options?: JSONDocumentDuplicateOptions): JSONCapabilityResult;
  canDuplicate(options?: JSONDocumentDuplicateOptions): JSONCapabilityResult;
  canCopy(source?: SelectionSource): JSONCapabilityResult;
  canCut(source?: SelectionSource): JSONCapabilityResult;
  canPaste(target?: JSONDocumentPasteTarget, options?: JSONDocumentPasteOptions): JSONCapabilityResult;
  canUndo(): JSONCapabilityResult;
  canRedo(): JSONCapabilityResult;
}

interface FixtureRow {
  id: string;
  title: string;
  count: number;
  tags: string[];
}

type _createJSONDocumentAcceptsExpectedSignature = Expect<
  IsAssignable<typeof createJSONDocument, ExpectedCreateJSONDocument>
>;
type _expectedCreateSignatureAcceptedByPublicApi = Expect<
  IsAssignable<ExpectedCreateJSONDocument, typeof createJSONDocument>
>;
type _useJSONDocumentAcceptsExpectedSignature = Expect<
  IsAssignable<typeof useJSONDocument, ExpectedUseJSONDocument>
>;
type _expectedUseSignatureAcceptedByPublicApi = Expect<
  IsAssignable<ExpectedUseJSONDocument, typeof useJSONDocument>
>;

type _applyOperationSignature = Expect<
  Equal<typeof applyOperation<FixtureSchema>, ExpectedPatchHelpers["applyOperation"]>
>;
type _applyPatchSignature = Expect<
  Equal<typeof applyPatch<FixtureSchema>, ExpectedPatchHelpers["applyPatch"]>
>;
type _applyPatchToTrustedStateSignature = Expect<
  Equal<typeof applyPatchToTrustedState<FixtureSchema>, ExpectedPatchHelpers["applyPatchToTrustedState"]>
>;

type _jsonResultCodeCatalog = Expect<
  Equal<Extract<JSONResult, { ok: false }>["code"], ExpectedJSONResultCode>
>;
type _capabilityResultCodeCatalog = Expect<
  Equal<Extract<JSONCapabilityResult, { ok: false }>["code"], ExpectedCapabilityErrorCode>
>;
type _copyErrorCodeCatalog = Expect<Equal<ClipboardCopyError["code"], ExpectedCopyErrorCode>>;
type _cutErrorCodeCatalog = Expect<Equal<ClipboardCutError["code"], ExpectedCutErrorCode>>;
type _pasteErrorCodeCatalog = Expect<
  Equal<ClipboardPasteError["code"], ExpectedPasteErrorCode>
>;
type _pasteEmptyCodeCatalog = Expect<Equal<ClipboardEmpty["code"], "empty_clipboard">>;
type _readEmptyCodeCatalog = Expect<
  Equal<Extract<ClipboardReadResult, { ok: false }>["code"], "empty_clipboard">
>;
type _duplicateErrorCodeCatalog = Expect<
  Equal<Extract<JSONDocumentDuplicateResult<FixtureRow>, { ok: false }>["code"], ExpectedDuplicateErrorCode>
>;

type _documentKeys = Expect<Equal<keyof JSONDocument<FixtureRow>, keyof ExpectedJSONDocument<FixtureRow>>>;
type _documentAcceptsExpectedSurface = Expect<
  IsAssignable<JSONDocument<FixtureRow>, ExpectedJSONDocument<FixtureRow>>
>;
type _expectedSurfaceAcceptedByDocument = Expect<
  IsAssignable<ExpectedJSONDocument<FixtureRow>, JSONDocument<FixtureRow>>
>;

const TransformSchema = z.object({
  count: z.string().transform((value) => Number(value)),
});

createJSONDocument(TransformSchema, { count: "1" }) satisfies JSONDocument<{ count: number }>;
createJSONDocument(TransformSchema, { count: 1 }, { trustedInitial: true }) satisfies JSONDocument<{ count: number }>;
useJSONDocument(TransformSchema, { count: "1" }) satisfies JSONDocument<{ count: number }>;
useJSONDocument(TransformSchema, { count: 1 }, { trustedInitial: true }) satisfies JSONDocument<{ count: number }>;

// @ts-expect-error trusted initial values must already be schema output.
createJSONDocument(TransformSchema, { count: "1" }, { trustedInitial: true });
// @ts-expect-error untrusted initial values must be schema input.
createJSONDocument(TransformSchema, { count: 1 });
// @ts-expect-error React trusted initial values must already be schema output.
useJSONDocument(TransformSchema, { count: "1" }, { trustedInitial: true });
// @ts-expect-error React untrusted initial values must be schema input.
useJSONDocument(TransformSchema, { count: 1 });

declare const doc: JSONDocument<FixtureRow>;
declare const item: FixtureRow;

doc.insert(item) satisfies JSONDocumentEditResult;
doc.insert("/tags/-", "next") satisfies JSONDocumentEditResult;
doc.insert({ into: "/tags" }, "next", { spread: false }) satisfies JSONDocumentEditResult;
doc.move("/tags/0", { after: "/tags/1" }) satisfies JSONDocumentEditResult;
doc.move({ before: "/tags/0" }) satisfies JSONDocumentEditResult;
doc.paste("/tags/-") satisfies ClipboardPasteResult<FixtureRow>;
doc.paste({ replace: "/title" }, { spread: false }) satisfies ClipboardPasteResult<FixtureRow>;
doc.canInsert(item) satisfies JSONCapabilityResult;
doc.canInsert({ into: "/tags" }, "next") satisfies JSONCapabilityResult;
doc.canMove("/tags/0", { after: "/tags/1" }) satisfies JSONCapabilityResult;
doc.canMove({ before: "/tags/0" }) satisfies JSONCapabilityResult;
doc.canPaste({ replace: "/title" }) satisfies JSONCapabilityResult;

const pastePointer: JSONDocumentPasteTarget = "/tags/-";
const pasteBefore: JSONDocumentPasteTarget = { before: "/tags/0" };
const pasteAfter: JSONDocumentPasteTarget = { after: "/tags/0" };
const pasteInto: JSONDocumentPasteTarget = { into: "/tags" };
const pasteReplace: JSONDocumentPasteTarget = { replace: "/title" };
const moveInto: JSONDocumentMoveTarget = { into: "/tags" };
pastePointer satisfies Pointer;
pasteBefore satisfies { before: Pointer };
pasteAfter satisfies { after: Pointer };
pasteInto satisfies { into: Pointer };
pasteReplace satisfies { replace: Pointer };
moveInto satisfies { into: Pointer };

// @ts-expect-error paste target uses pointer directly; `{ at }` is not a public placement shape.
doc.paste({ at: "/tags/-" });
doc.replace("/title") satisfies JSONDocumentEditResult;
doc.insert({ into: "/tags" }) satisfies JSONDocumentEditResult;
// @ts-expect-error move with explicit source requires a target.
doc.move("/tags/0", undefined);
