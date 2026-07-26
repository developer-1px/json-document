import {
  appendSegment,
  applyPatch,
  buildPointer,
  createJSONDocument,
  parentPointer,
  parsePointer,
  trackPointer,
  tryParsePointer,
  type JSONAppliedChange,
  type JSONCapabilityResult,
  type JSONChangeMetadata,
  type JSONDocument,
  type JSONDocumentCommitOptions,
  type JSONDocumentCommitResult,
  type JSONPatchOperation,
  type JSONPatchResult,
  type JSONValue,
  type Pointer,
  type QueryResult,
  type ReadResult,
} from "@interactive-os/json-document";

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends
  (<T>() => T extends Right ? 1 : 2)
    ? true
    : false;
type Expect<T extends true> = T;

type ProjectionMembers = keyof JSONDocument;
type _ProjectionMembersAreExact = Expect<Equal<
  ProjectionMembers,
  "value" | "at" | "query" | "canPatch" | "commit" | "subscribe"
>>;

interface Row {
  id: string;
  done: boolean;
}

const initial: Row = { id: "a", done: false };
const document = createJSONDocument(initial, {
  accepts(candidate): JSONCapabilityResult {
    return typeof candidate === "object" && candidate !== null
      ? { ok: true }
      : { ok: false, code: "schema_violation" };
  },
});
document satisfies JSONDocument;
document.value satisfies JSONValue;

const operations: ReadonlyArray<JSONPatchOperation> = [
  { op: "replace", path: "/done", value: true },
];
const pureResult = applyPatch(initial, operations);
pureResult satisfies JSONPatchResult;
document.canPatch(operations) satisfies JSONCapabilityResult;
document.commit(operations, {
  metadata: { origin: "signature" },
}) satisfies JSONDocumentCommitResult;
document.at("/id") satisfies ReadResult;
document.query("$.id") satisfies QueryResult;
document.subscribe((change: JSONAppliedChange) => {
  change.applied satisfies ReadonlyArray<JSONPatchOperation>;
}) satisfies () => void;

const metadata: JSONChangeMetadata = { nested: { stable: true } };
const options: JSONDocumentCommitOptions = { metadata };
options satisfies JSONDocumentCommitOptions;

const pointer: Pointer = appendSegment("", "items");
buildPointer(["items", 0]) satisfies Pointer;
parsePointer(pointer) satisfies string[];
tryParsePointer(pointer) satisfies string[] | null;
parentPointer(pointer) satisfies Pointer | null;
trackPointer(pointer, operations) satisfies Pointer | null;

const futureFailure = {
  ok: false as const,
  code: "future_standard_code",
  diagnostic: { retryable: false },
};
const forwardCompatibleResult: JSONPatchResult = futureFailure;
forwardCompatibleResult satisfies JSONPatchResult;

// @ts-expect-error v2 patch payloads are JSON data, not arbitrary host values.
const callablePatch: JSONPatchOperation = { op: "add", path: "/run", value: () => undefined };

// @ts-expect-error Editing Session controls are not part of the six-member Kernel.
document.undo();
