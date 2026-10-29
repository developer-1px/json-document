import type { ComponentType, ReactNode } from "react";
import {
  AuroraMass, BlobMass, BorderBeam, CloudMass, CometArc, DualRings, EqualizerBars,
  FadeSpokes, GradientSweep, HelixDots, HelixRings, HueOutline, InfinityStroke,
  LoadingBar, MassOrb, MorseCode, MorphSquare, OrbitDots, ParticleBurst,
  ProgressRing, PulsingDot, PulsingOrb, RadarSweep, RingMass, Shimmer,
  ShimmerText, Skeleton, StaggerLines, StreamingCaret, WaveDots, WaveGrid,
  type AnimationStatusProps,
} from "@interactive-os/json-document-animation-react";
import type { UIComponentAdapterProps } from "./ui-component-controls.js";

const statuses: Readonly<Record<string, ComponentType<AnimationStatusProps>>> = {
  "comet-arc": CometArc, "dual-rings": DualRings, "equalizer-bars": EqualizerBars,
  "fade-spokes": FadeSpokes, "helix-dots": HelixDots, "helix-rings": HelixRings,
  "infinity-stroke": InfinityStroke, "mass-orb": MassOrb, "morse-code": MorseCode,
  "morph-square": MorphSquare, "orbit-dots": OrbitDots, "particle-burst": ParticleBurst,
  "progress-ring": ProgressRing, "pulsing-dot": PulsingDot, "pulsing-orb": PulsingOrb,
  "radar-sweep": RadarSweep, "wave-grid": WaveGrid,
};
const surfaces: Readonly<Record<string, ComponentType>> = {
  "aurora-mass": AuroraMass, "blob-mass": BlobMass, "border-beam": BorderBeam,
  "cloud-mass": CloudMass, "gradient-sweep": GradientSweep, "hue-outline": HueOutline,
  "loading-bar": LoadingBar, "ring-mass": RingMass,
};

/** Animation names map directly to public exports; no fabricated completion semantics. */
export function renderUIComponentFeedback({text, content}: UIComponentAdapterProps): ReactNode | undefined {
  const p = content.props ?? {};
  const status = {announce: p.announce === true, label: text};
  const Status = statuses[content.component];
  if (Status) return <Status {...status} />;
  const Surface = surfaces[content.component];
  if (Surface) return <Surface />;
  switch (content.component) {
    case "shimmer": return <Shimmer>{content.detail || text}</Shimmer>;
    case "shimmer-text": return <ShimmerText {...status} tone={p.tone === "spectrum" ? "spectrum" : "mono"}>{text}</ShimmerText>;
    case "skeleton": return <Skeleton shape={p.shape === "block" || p.shape === "avatar" ? p.shape : "line"} />;
    case "stagger-lines": return <StaggerLines lines={typeof p.lines === "number" ? p.lines : 3} />;
    case "streaming-caret": return <StreamingCaret />;
    case "wave-dots": return <WaveDots {...status} frame={p.frame === "bubble" ? "bubble" : "none"} />;
    default: return undefined;
  }
}
