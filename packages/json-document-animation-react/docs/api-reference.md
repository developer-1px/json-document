# @interactive-os/json-document-animation-react API

**탐색 분류:** UI Primitives

진행·대기·전환 상태의 반복 시각 행동의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

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
## `CometArc`

```ts
CometArc(props: SpanProps): ReactNode
```
## `DualRings`

```ts
DualRings(props: SpanProps): ReactNode
```
## `EqualizerBars`

```ts
EqualizerBars(props: SpanProps): ReactNode
```
## `FadeSpokes`

```ts
FadeSpokes(props: SpanProps): ReactNode
```
## `GradientSweep`

```ts
GradientSweep(props: DivProps): ReactNode
```
## `HelixDots`

```ts
HelixDots(props: SpanProps): ReactNode
```
## `HelixRings`

```ts
HelixRings(props: SpanProps): ReactNode
```
## `HueOutline`

```ts
HueOutline(props: DivProps): ReactNode
```
## `InfinityStroke`

```ts
InfinityStroke(props: SpanProps): ReactNode
```
## `LoadingBar`

```ts
LoadingBar(props: DivProps & {readonly value?: number}): ReactNode
```
## `MassOrb`

```ts
MassOrb(props: SpanProps): ReactNode
```
## `MorphSquare`

```ts
MorphSquare(props: SpanProps): ReactNode
```
## `MorseCode`

```ts
MorseCode(props: SpanProps): ReactNode
```
## `OrbitDots`

```ts
OrbitDots(props: SpanProps): ReactNode
```
## `ParticleBurst`

```ts
ParticleBurst(props: SpanProps): ReactNode
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
## `RadarSweep`

```ts
RadarSweep(props: SpanProps): ReactNode
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

## 보편적인 로딩·진행 Usage

[카탈로그](/demo/ui-primitives#design-system-wait-animations)는 짧은 확인의 ProgressRing, 목록·표·문서 형태의 Skeleton, 파일 전송 LoadingBar, 응답 끝 StreamingCaret를 공개 API로 조합합니다. 별도의 색·간격·곡률 토큰을 추가하지 않습니다. 큰 ambient 시각과 spectrum 텍스트는 기본 대기 예제에서 사용하지 않습니다. 단색 ShimmerText는 AI 실행 상태 문구에 사용합니다.

LoadingBar.value는 실제 완료율 0–100이며 0도 유효합니다. 유한 수치를 범위 안으로 제한합니다. 값이 없으면 불확정 진행이며 aria-valuenow를 생략합니다. value 또는 접근성 이름이 있으면 role=progressbar를 제공하고, 표시할 이름은 aria-label/aria-labelledby로 전달합니다. 비율을 알 때는 고정된 채움으로, 모를 때만 이동하는 막대로 표현합니다. reduced-motion에서도 확정 진행 값은 유지됩니다.

대기 길이에 따라 장식의 규모를 키우지 않습니다. 빠른 완료를 위해 별도 지연을 만들지 않고, 짧은 대기는 대상 옆 스피너로, 긴 대기는 실제 진행 정보·이미 도착한 콘텐츠·가능한 취소 수단으로 설명합니다. 콘텐츠의 종류는 Skeleton의 새 variant가 아니라 기존 line/avatar/block을 Host가 실제 레이아웃에 맞춰 조합합니다.

근거: [Apple Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators), [WAI-ARIA 범위 값](https://www.w3.org/WAI/ARIA/apg/practices/range-related-properties/). 카탈로그의 파일 완료·취소는 MOCK 조작이며 실제 파일 전송이 아닙니다.

### AI 대기의 정보 구분

[Reasoning](https://elements.ai-sdk.dev/components/reasoning)의 소요 시간과 [단계 표시](https://elements.ai-sdk.dev/components/chain-of-thought)를 표현 사례로 참고합니다. 한 라이브러리의 사례를 전 생태계 표준으로 단정하지 않습니다. 도입이나 의존성 추가 없이 기존 정본으로 조합합니다.

경과 시간은 UI Primitives의 ElapsedTime, 실제 작업 단계는 Stepper와 DisclosureButton, 도구별 상태는 SemanticIcon/ProgressRing/StatusBadge가 소유합니다. 카탈로그에서 각각 별도 예제로 확인할 수 있습니다. 도구/단계 fixture는 공개 실행 이벤트의 예시이며 내부 추론을 창작해 표시하지 않습니다. LoadingBar.value는 완료율, ElapsedTime은 지나간 시간이고 서로 대체하지 않습니다.

## AI 대기에서 표현이 바뀌는 시점

| 정보 상태 | 공개 API 조합 | 종료·전환 |
| --- | --- | --- |
| 내용 도착 전 | WaveDots(announce/label) | 첫 내용 도착 시 제거하고 실제 본문 표시 |
| AI 작업 실행 중 | ShimmerText + ElapsedTime | 완료 시 일반 텍스트, endedAt으로 소요 시간 고정 |
| 실행 요약과 펼친 단계 | DisclosureButton + ShimmerText + Stepper | 단계 이벤트로 상태 전환, 완료 시 쉬머 없는 요약; 사용자의 펼침 선택 유지 |
| 내용 도착 중 | 본문 + StreamingCaret | 완료 시 커서 제거; 도착한 본문 유지 |

모든 전환은 작업 이벤트나 콘텐츠 도착 상태로 결정합니다. 카탈로그는 명시적인 MOCK 조작을 사용하고 실제 AI 호출을 가장하지 않습니다. 같은 상태를 보여주려고 스피너·점·쉬머를 한 줄에 모두 겹치지 않습니다. 기본 테마는 단색이며 글자 쉬머와 장식용 다색 ambient는 구분합니다.

비교한 1차 자료: [Vercel Shimmer](https://elements.ai-sdk.dev/components/shimmer), [prompt-kit TextShimmer](https://github.com/ibelick/prompt-kit/blob/main/components/prompt-kit/text-shimmer.tsx), [assistant-ui Thinking indicator](https://www.assistant-ui.com/elements/thinking-indicator), [Typing indicator](https://www.assistant-ui.com/elements/typing-indicator), [Reasoning](https://www.assistant-ui.com/elements/reasoning). 형태와 전환 시점을 참고하며 외부 라이브러리의 토큰·의존성·런타임을 도입하지 않습니다.

Chrome의 실제 MOCK 전환에서 실행 중 ShimmerText의 animation-name을 확인했습니다. 첫 응답 도착 후 dots=0/caret=1, 완료 후 caret=0과 본문 보존을 확인했습니다. AI 작업 완료 뒤 소요 시간 0:30 유지, 세 단계 모두 완료 후 일반 요약 전환을 확인했습니다. 비교 스크린샷은 `/tmp/json-document-design-review/ai-shimmer-running.jpg`와 `ai-shimmer-complete.jpg`입니다. prefers-reduced-motion에서는 쉬머 애니메이션이 멈추고 일반 글자색으로 읽힙니다. 서버 AI 실행을 검증한 것은 아니며 자동 검사는 shared-worktree-dev 흐름에 따라 실행하지 않았습니다.

WaveDots는 UI Primitives의 동일 구현을 re-export한다. ChatActivity와 animation catalog가 같은 markup·keyframe·reduced-motion을 사용하며 styles.css는 canonical chat-bubble.css를 import한다.
