# @interactive-os/json-document-annotation API

**탐색 분류:** Hands

Raster annotation 도구·선택·제스처·UI 조합의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-annotation/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `AnnotationHand`

```ts
AnnotationHand(props: AnnotationHandProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `AnnotationHandClassNames`

```ts
interface AnnotationHandClassNames {
  readonly frame?: string;
  readonly stage?: string;
  readonly canvas?: string;
  readonly commentCard?: string;
  readonly commentInput?: string;
  readonly commentPreview?: string;
  readonly sendButton?: string;
  readonly toolDock?: string;
  readonly dockButton?: string;
  readonly dockDivider?: string;
}
```
## `AnnotationHandLabels`

```ts
interface AnnotationHandLabels {
  readonly canvas?: string;
  readonly tools?: string;
  readonly instruction?: string;
  readonly instructionPlaceholder?: string;
  readonly sendComment?: string;
  readonly deleteAnnotation?: string;
  readonly downloadImage?: string;
}
```
## `AnnotationHandProps`

```ts
interface AnnotationHandProps {
  readonly editor: AnnotationEditor;
  readonly sourceUrl: string;
  readonly tool: AnnotationTool;
  readonly onToolChange: (tool: AnnotationTool) => void;
  readonly reactionShadow?: string;
  readonly createId: () => string;
  readonly classNames?: AnnotationHandClassNames;
  readonly enabledTools?: ReadonlyArray<AnnotationTool>;
  readonly labels?: AnnotationHandLabels;
  readonly rasterStyle: WebAnnotationRasterStyle;
  readonly onAnnouncement?: (message: string) => void;
}
```
## `AnnotationOutput`

```ts
interface AnnotationOutput {
  readonly structured: string;
  readonly structuredDownloadUrl: string;
  readonly renderedImage: string | null;
  readonly imageError: boolean;
  readonly canRestore: boolean;
  save(): void;
  restore(): boolean;
}
```
## `AnnotationOutputOptions`

```ts
interface AnnotationOutputOptions {
  /** The same document instance passed to createAnnotationEditor. */
  readonly document: JSONDocument;
  readonly editor: AnnotationEditor;
  readonly sourceUrl: string;
  readonly rasterStyle: WebAnnotationRasterStyle;
  readonly renderImage: boolean;
}
```
## `AnnotationTool`

```ts
type AnnotationTool = "select" | "comment" | "draw" | "arrow" | "like" | "dislike";
```
## `annotationTools`

```ts
const annotationTools: readonly [{ readonly id: "select"; readonly label: "Select"; readonly shortcut: "V"; readonly icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>; }, ... 4 more ..., { ...; }]
```
## `useAnnotationOutput`

```ts
useAnnotationOutput(options: AnnotationOutputOptions): AnnotationOutput
```
