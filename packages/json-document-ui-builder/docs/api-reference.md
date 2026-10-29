# @interactive-os/json-document-ui-builder API

**탐색 분류:** Hands

UI 빌더 화면·데이터·액션 관리 Hand와 스키마 기반 Faker 예시 생성 연결의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-ui-builder/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `createFakerSampleGenerator`

```ts
createFakerSampleGenerator(seed?: number): UIBuilderSampleGenerator
```
## `UIBuilderRuntimeHand`

Controlled `runtimeValues?: UIBuilderRuntimeValues`와 `onRuntimeValuesChange?: (values: UIBuilderRuntimeValues) => void`는 검색·필터 등의 임시 실행 입력을 외부 소유자와 공유한다. 생략하면 내부 상태를 사용한다.

```ts
UIBuilderRuntimeHand({ editor, skills, selection: controlledSelection, onSelectionChange, editable, pageId, onPageChange }: { readonly editable?: boolean; readonly pageId?: string; readonly onPageChange?: (pageId: string) => void; readonly editor: ObjectEditor; readonly skills: readonly UIBuilderSkillDefinition[]; readonly selection?: UIBuilderRecordSelection; readonly onSelectionChange?: (selection: UIBuilderRecordSelection) => void; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `UIBuilderStorageControls`

```ts
UIBuilderStorageControls({ editor, state, retry }: { readonly editor: ObjectEditor; readonly state: WebDocumentSaveState; readonly retry: () => void; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `UIBuilderWorkspace`

```ts
UIBuilderWorkspace({ editor, generateSamples, skills, navigation, status, arrange, initialTab, pageId, onPageChange }: { readonly editor: ObjectEditor; readonly generateSamples: UIBuilderSampleGenerator; readonly skills?: readonly UIBuilderSkillDefinition[]; readonly navigation?: ReactNode; readonly status?: ReactNode; readonly arrange?: (signal: AbortSignal, context?: {pageId: string; selection: UIBuilderRecordSelection; runtimeValues: UIBuilderRuntimeValues}) => Promise<void>; readonly initialTab?: "screen" | "run"; readonly pageId?: string; readonly onPageChange?: (pageId: string) => void; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```

`navigation`은 프로젝트 조작, `status`는 저장 상태 등의 Host slot입니다.
[제품 툴바 Usage](/applications/ui-builder?example=issue-feed)는 두 slot과 현재 페이지 전환을 조합합니다.
