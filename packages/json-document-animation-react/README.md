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
