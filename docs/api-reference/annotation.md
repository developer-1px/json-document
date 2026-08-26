# @interactive-os/json-document-annotation API

**Owner:** Hands

Annotation Hand interaction과 SVG projection의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

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
  readonly createId: () => string;
  readonly classNames?: AnnotationHandClassNames;
  readonly enabledTools?: ReadonlyArray<AnnotationTool>;
  readonly labels?: AnnotationHandLabels;
  readonly rasterStyle: WebAnnotationRasterStyle;
  readonly onAnnouncement?: (message: string) => void;
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
