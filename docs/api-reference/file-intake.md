# @interactive-os/json-document-file-intake API

**Owner:** Artifact

플랫폼 독립 파일 후보와 수용 정책의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-file-intake/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `FileAcceptancePolicy`

```ts
interface FileAcceptancePolicy extends Record<string, JSONValue> {
  readonly acceptedMediaTypes: ReadonlyArray<string>;
  readonly maxFiles: number | null;
  readonly maxBytesPerFile: number | null;
}
```
## `FileCandidate`

```ts
interface FileCandidate extends Record<string, JSONValue> {
  readonly name: string;
  readonly size: number;
  readonly mediaType: string | null;
}
```
## `FileIntakeResult`

```ts
type FileIntakeResult<Candidate extends FileCandidate = FileCandidate> =
  | { readonly ok: true; readonly candidates: ReadonlyArray<Candidate> }
  | { readonly ok: false; readonly code: "file-intake.invalid" | "file-intake.limit" | "file-intake.media-type" | "file-intake.size"; readonly candidate: Candidate };
```
## `validateFileCandidates`

```ts
validateFileCandidates<Candidate extends FileCandidate>(candidates: ReadonlyArray<Candidate>, policy: FileAcceptancePolicy, options?: { readonly currentCount?: number; }): FileIntakeResult<Candidate>
```
