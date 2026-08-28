# @interactive-os/json-document-animation-react API

**Owner:** UI Primitives

생성 대기 시각 언어의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-animation-react/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `AnimationStatusProps`

```ts
type AnimationStatusProps = {
  /** When true, expose the visual as a polite status for assistive tech. */
  readonly announce?: boolean;
  /** Accessible name used when `announce` is true. */
  readonly label?: string;
};
```
## `AuroraMass`

```ts
AuroraMass(props: DivProps): ReactNode
```
## `BlobMass`

```ts
BlobMass(props: DivProps): ReactNode
```
## `BorderBeam`

```ts
BorderBeam(props: DivProps): ReactNode
```
## `CloudMass`

```ts
CloudMass(props: DivProps): ReactNode
```
## `GradientSweep`

```ts
GradientSweep(props: DivProps): ReactNode
```
## `HueOutline`

```ts
HueOutline(props: DivProps): ReactNode
```
## `LoadingBar`

```ts
LoadingBar(props: DivProps): ReactNode
```
## `MassOrb`

```ts
MassOrb(props: SpanProps): ReactNode
```
## `MorseCode`

```ts
MorseCode(props: SpanProps): ReactNode
```
## `ProgressRing`

```ts
ProgressRing(props: SpanProps): ReactNode
```
## `PulsingDot`

```ts
PulsingDot(props: SpanProps): ReactNode
```
## `PulsingOrb`

```ts
PulsingOrb(props: SpanProps): ReactNode
```
## `RingMass`

```ts
RingMass(props: DivProps): ReactNode
```
## `Shimmer`

```ts
Shimmer(props: DivProps): ReactNode
```
## `ShimmerText`

```ts
ShimmerText(props: SpanProps & { readonly tone?: ShimmerTone; }): ReactNode
```
## `ShimmerTone`

```ts
type ShimmerTone = "mono" | "spectrum";
```
## `Skeleton`

```ts
Skeleton(props: DivProps & { readonly shape?: SkeletonShape; }): ReactNode
```
## `SkeletonShape`

```ts
type SkeletonShape = "line" | "block" | "avatar";
```
## `StaggerLines`

```ts
StaggerLines(props: DivProps & { readonly lines?: number; }): ReactNode
```
## `StreamingCaret`

```ts
StreamingCaret(props: HTMLAttributes<HTMLSpanElement>): ReactNode
```
## `WaveDots`

```ts
WaveDots(props: SpanProps & { readonly frame?: WaveFrame; }): ReactNode
```
## `WaveFrame`

```ts
type WaveFrame = "none" | "bubble";
```
## `WaveGrid`

```ts
WaveGrid(props: SpanProps): ReactNode
```
