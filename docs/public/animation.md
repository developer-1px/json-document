# Animation

생성 대기 구간의 시각 언어입니다. Agent runtime, 토큰 전송, 부분 마크다운
렌더와 Hands는 여기 없습니다.

```text
Composer ── 사람 → agent 턴
Animation ── think · stream · tool 의 보이는 움직임
Viewport ── 스트림 중 대상을 화면에 붙잡기
```

정본 구현: `packages/json-document-animation-react`

```sh
npm i @interactive-os/json-document-animation-react
```

```tsx
import {
  AuroraMass,
  BlobMass,
  MassOrb,
  RingMass,
  ShimmerText,
  WaveDots,
} from "@interactive-os/json-document-animation-react";
import "@interactive-os/json-document-animation-react/styles.css";

<MassOrb />
<BlobMass />
<AuroraMass />
<RingMass />
<ShimmerText announce label="Thinking">Thinking…</ShimmerText>
<WaveDots frame="bubble" />
```

큰 형체는 음성 오브, 블롭, 오로라 패널, 링 필드, 점 구름입니다. 모노 쉬머는
선 위에 하이라이트 밴드가 지나갑니다. Host는 copy, 배치, 토큰을 소유하고
`data-ui-animation` 훅에 제품 색을 연결합니다. `announce`를 켠 시각만
`role="status"`가 됩니다. 기본 주기는 생성 대기처럼 천천히 쉬고,
`prefers-reduced-motion`에서는 움직임이 멈춥니다. Host는 `--jd-animation-duration`,
`--jd-animation-place`, `--jd-animation-identity`, `--jd-animation-spread`로
더 늦추거나 밴드 폭을 바꿀 수 있습니다.

```live-demo
/demo/animation
```
