# @interactive-os/json-document-annotation API

**탐색 분류:** Hands

Annotation 표시·지시 입력·실행 결과 검토·다음 첨삭 UI 조합의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

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
  /** SVG content below the annotation layer, for non-raster documents. */
  readonly content?: ReactNode;
  readonly onCommentEditingChange?: (editing: boolean) => void;
  readonly onAnnotationCreated?: (annotation: Annotation) => void;
  readonly onSubmitAnnotation?: (annotation: Annotation) => void;
  readonly renderCommentComposer?: (options: { annotation: Annotation; submit: (instruction: string) => void; cancel: () => void }) => ReactNode;
  readonly tool: AnnotationTool;
  readonly onToolChange: (tool: AnnotationTool) => void;
  readonly reactionShadow?: string;
  readonly createId: () => string;
  readonly classNames?: AnnotationHandClassNames;
  readonly enabledTools?: ReadonlyArray<AnnotationTool>;
  readonly toolLabels?: Partial<Record<AnnotationTool, string>>;
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
## `AnnotationReview`

```ts
AnnotationReview({ session, queue, liveSource, renderContent, title, label, createId, canvasLabel, className, speechInput }: AnnotationReviewProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `AnnotationReviewGroup`

```ts
AnnotationReviewGroup({ children }: { readonly children: ReactNode; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `AnnotationReviewProps`

```ts
interface AnnotationReviewProps {
  readonly session: AnnotationReviewSession;
  readonly queue: AnnotationReviewQueue;
  readonly liveSource: string;
  /** SVG children rendered in the session source's coordinate space. */
  readonly renderContent: (source: string) => ReactNode;
  readonly title: ReactNode;
  readonly label: string;
  readonly createId: () => string;
  readonly canvasLabel?: string;
  readonly className?: string;
  readonly speechInput?: ChatComposerProps<string, never>["speechInput"];
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

## Voice-first continuous review

Pass `following={{ queue, createId, lang: "ko-KR" }}` to `AnnotationReviewGroup`. Descendant `AnnotationReview` surfaces share one persistent speech session and show live results. Hover points, click marks a location, and dragging draws ink; no per-mark composer or submit step is shown. A fixed microphone control shows listening, transcript, progress and errors. Browser recognition restarts after normal ends; microphone errors and hidden documents pause it. In-flight speech corrections cancel and replace the obsolete execution. Chrome STT final segments feed the executor; semantic endpoint detection and true mid-generation steering are not provided. Existing manual review remains available by omitting `following`.

`AnnotationHand.following` suppresses tool/composer UI and keeps drawing active. `onPoint` reports hover coordinates; `onAnnotationCreated` also reports focused existing marks in following mode.

Continuous review retains per-page task threads: readable request, registration/execution state, actual streamed agent response, failure/retry, saved before/after comparison and explicit confirmation. Confirmation acknowledges an already-published result. The microphone dock links to work awaiting attention. Task marks remain after reload and select their thread. `AnnotationHand.annotations` supplies a read-only annotation projection in following mode; `highlightedAnnotationId` connects thread focus to its mark.

Continuous review groups tasks into 진행 중 (queued/planning/running) and 확인할 결과 (review/error). Accepted tasks and their marks are hidden until 완료 기록 is expanded. The dock counts active work and results awaiting attention, excluding completed history.

Following review supports document-local progress through the optional second
argument of `renderContent(source, projection)`. Pass the projection to the content
renderer and report measured `AnnotationReviewRegion[]` keyed by task ID through
`projection.onRegions`. The canonical UI anchors its note with
`useAnchoredFloatingPosition` and displays targets, running state, and actual
change regions. Completed strokes disappear on `review`; failed strokes remain.
Confirmed tasks and their regions are hidden until history is opened.

Optional `onRevert(task): boolean` must atomically restore the task's original
source only if its result is still current. `false` preserves the task and shows a
conflict explanation. It must never invoke a blind global undo over later edits.

FollowingReview renders located interim speech immediately through the canonical
`ChatBubble` (outgoing). Pending tasks remain anchored at the request location
until measured agent targets arrive; request pins do not claim to be understood
DOM elements. Actual replies use incoming ChatBubble, transient work uses
ChatActivity, and Popover owns dismissal and focus. Voice-triggered popovers use
`autoFocus={false}`. Only one task conversation is expanded across a review group;
page task lists and completed history remain collapsed until requested.
