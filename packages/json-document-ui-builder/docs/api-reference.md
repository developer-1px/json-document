# @interactive-os/json-document-ui-builder API

**탐색 분류:** Hands

UI 빌더 화면·데이터·액션 관리 Hand와 스키마 기반 Faker 예시 생성 연결의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-ui-builder/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `createFakerSampleGenerator`

```ts
createFakerSampleGenerator(seed?: number): UIBuilderSampleGenerator
```
## `UIBuilderWorkspace`

```ts
UIBuilderWorkspace({ editor, generateSamples }: { readonly editor: ObjectEditor; readonly generateSamples: UIBuilderSampleGenerator; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
