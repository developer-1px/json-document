# @interactive-os/json-document-animation-react

Canonical wait-animation visuals for json-document Hosts. The package owns the
visible motion of generation waits, not agent runtime, token transport, or
Hands.

Included visuals:

- `ShimmerText` — standing text with a highlight band, or a spectrum fill
- `WaveDots` / `WaveGrid` — bouncing dots and a Claude-style ellipse matrix
- `StreamingCaret` — live edge of a stream
- `PulsingDot` / `PulsingOrb` / `MorseCode` / `OrbitDots` / `EqualizerBars` / `ProgressRing` / `DualRings` / `FadeSpokes` / `RadarSweep` / `InfinityStroke` / `MorphSquare` / `CometArc` / `HelixDots` / `ParticleBurst` / `HelixRings` / `LoadingBar`
- `Skeleton` / `StaggerLines` / `Shimmer` — placeholders
- `GradientSweep` / `BorderBeam` / `HueOutline` — identity outlines
- `MassOrb` / `BlobMass` / `AuroraMass` / `RingMass` / `CloudMass` — large form masses

Host owns copy, layout, and tokens. Map `data-ui-animation` hooks to product
color; do not reimplement the motion.

```sh
npm i @interactive-os/json-document-animation-react
```

```tsx
import {
  ShimmerText,
  WaveDots,
  WaveGrid,
} from "@interactive-os/json-document-animation-react";
import "@interactive-os/json-document-animation-react/styles.css";

<ShimmerText announce label="Thinking">Thinking…</ShimmerText>
<WaveDots frame="bubble" />
<WaveGrid />
```

`announce` opts a status visual into `role="status"`. Skeletons, bars, and the
caret stay decorative. Motion stops under `prefers-reduced-motion`.

표현 스타일은 UI Primitives의 `design-tokens.css`를 가져와 콘텐츠 간격
`related` 8px / `group` 16px / `region` 32px을 소비합니다. 글자·마커와
애니메이션 도형 내부의 치수는 콘텐츠 배치 간격과 구분합니다.

기본 제품 대기 표현은 [로딩·진행 카탈로그](/demo/ui-primitives#design-system-wait-animations)에서 확인합니다. 짧은 작업은 작은 ProgressRing과 상태 문구, 목록·표·문서는 실제 도착할 구조의 Skeleton, 알려진 파일 전송 비율은 LoadingBar.value(0–100), 생성된 문장의 끝은 StreamingCaret를 사용합니다. 큰 ambient 효과는 기본 대기로 쓰지 않습니다. 글자 쉬머는 AI 상태 문구에 사용하고 작업 완료 시 일반 텍스트로 전환합니다. WaveDots는 첫 콘텐츠가 오기 전 대기에 사용하며, 내용이 도착하면 콘텐츠와 StreamingCaret로 대체합니다. 오래 기다릴수록 실제 진행 정보와 취소 수단을 보강하며, 대기를 보여주기 위한 인위적인 지연은 만들지 않습니다.

Chrome에서 MOCK 전송 값 60→80 및 취소 상태, prefers-reduced-motion에서 스피너·막대·커서의 animation:none과 80% 채움 보존을 확인했습니다. 이번 검증은 카탈로그의 조합과 해당 CSS에 한정하며 모든 소비자 회귀 검사는 수행하지 않았습니다. shared-worktree-dev 흐름에 따라 자동 테스트·타입 검사·빌드는 실행하지 않았습니다.
