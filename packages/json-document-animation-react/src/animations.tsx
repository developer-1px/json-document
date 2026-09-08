import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

export type AnimationStatusProps = {
  /** When true, expose the visual as a polite status for assistive tech. */
  readonly announce?: boolean;
  /** Accessible name used when `announce` is true. */
  readonly label?: string;
};

export type ShimmerTone = "mono" | "spectrum";
export type SkeletonShape = "line" | "block" | "avatar";
export type WaveFrame = "none" | "bubble";

type SpanProps = HTMLAttributes<HTMLSpanElement> & AnimationStatusProps;
type DivProps = HTMLAttributes<HTMLDivElement>;

function statusProps(announce: boolean | undefined, label: string | undefined) {
  if (!announce) return { "aria-hidden": true as const };
  return { role: "status" as const, "aria-live": "polite" as const, "aria-label": label };
}

function Beats(count: number, slot: string): ReactNode {
  return Array.from({ length: count }, (_, index) => <span key={index} data-ui-animation={slot} />);
}

export function ShimmerText(props: SpanProps & { readonly tone?: ShimmerTone }): ReactNode {
  const { announce, label, tone = "mono", children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="shimmer-text" data-ui-shimmer={tone}>
      {children}
    </span>
  );
}

export function Shimmer(props: DivProps): ReactNode {
  const { children, ...boxProps } = props;
  return (
    <div {...boxProps} data-ui-animation="shimmer" aria-hidden={props["aria-hidden"] ?? true}>
      {children}
    </div>
  );
}

export function Skeleton(props: DivProps & { readonly shape?: SkeletonShape }): ReactNode {
  const { shape = "line", ...boxProps } = props;
  return <div {...boxProps} data-ui-animation="skeleton" data-ui-skeleton={shape} aria-hidden={props["aria-hidden"] ?? true} />;
}

export function StaggerLines(props: DivProps & { readonly lines?: number }): ReactNode {
  const { lines = 3, ...boxProps } = props;
  return (
    <div {...boxProps} data-ui-animation="stagger-lines" aria-hidden={props["aria-hidden"] ?? true}>
      {Array.from({ length: lines }, (_, index) => (
        <span
          key={index}
          data-ui-animation="stagger-line"
          style={{ "--delay": `${index * 0.42}s`, "--width": index === lines - 1 ? "64%" : "100%" } as CSSProperties}
        />
      ))}
    </div>
  );
}

export function StreamingCaret(props: HTMLAttributes<HTMLSpanElement>): ReactNode {
  return <span {...props} data-ui-animation="caret" aria-hidden={props["aria-hidden"] ?? true} />;
}

export function WaveDots(props: SpanProps & { readonly frame?: WaveFrame }): ReactNode {
  const { announce, label, frame = "none", children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="wave-dots" data-ui-frame={frame === "bubble" ? "bubble" : undefined}>
      {Beats(3, "dot")}
      {children}
    </span>
  );
}

const WAVE_ROWS: ReadonlyArray<number> = [3, 5, 7, 5, 3];

export function WaveGrid(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="wave-grid">
      {WAVE_ROWS.map((count, row) => (
        <span key={row} data-ui-animation="wave-row">
          {Array.from({ length: count }, (_, column) => (
            <span
              key={column}
              data-ui-animation="wave-cell"
              style={{ "--delay": `${column * 80 + row * 50}ms` } as CSSProperties}
            />
          ))}
        </span>
      ))}
      {children}
    </span>
  );
}

export function PulsingDot(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="pulsing-dot">
      {children}
    </span>
  );
}

export function PulsingOrb(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="pulsing-orb">
      <span data-ui-animation="orb-core" />
      <span data-ui-animation="orb-ring" />
      <span data-ui-animation="orb-ring" data-ui-ring="late" />
      {children}
    </span>
  );
}

export function MorseCode(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="morse">
      {Beats(4, "morse-beat")}
      {children}
    </span>
  );
}

export function OrbitDots(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="orbit-dots">
      {Array.from({ length: 6 }, (_, index) => (
        <span
          key={index}
          data-ui-animation="orbit-dot"
          style={{ "--angle": `${index * 60}deg` } as CSSProperties}
        />
      ))}
      {children}
    </span>
  );
}

export function EqualizerBars(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="equalizer">
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          data-ui-animation="eq-bar"
          style={{ "--delay": `${index * 0.16}s` } as CSSProperties}
        />
      ))}
      {children}
    </span>
  );
}

export function LoadingBar(props: DivProps): ReactNode {
  return (
    <div {...props} data-ui-animation="loading-bar" aria-hidden={props["aria-hidden"] ?? true}>
      <span data-ui-animation="loading-fill" />
    </div>
  );
}

export function ProgressRing(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="progress-ring">
      {children}
    </span>
  );
}

export function DualRings(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="dual-rings">
      <span data-ui-animation="dual-ring" data-ui-dual="outer" />
      <span data-ui-animation="dual-ring" data-ui-dual="inner" />
      {children}
    </span>
  );
}

export function FadeSpokes(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="fade-spokes">
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          data-ui-animation="spoke"
          style={{ "--angle": `${index * 30}deg`, "--i": index } as CSSProperties}
        />
      ))}
      {children}
    </span>
  );
}

export function RadarSweep(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="radar-sweep">
      <span data-ui-animation="radar-face" />
      <span data-ui-animation="radar-beam" />
      {children}
    </span>
  );
}

const INFINITY_PATH =
  "M50,20 C50,4 72,4 72,20 C72,36 94,36 94,20 C94,4 72,4 72,20 C72,36 50,36 50,20 C50,4 28,4 28,20 C28,36 6,36 6,20 C6,4 28,4 28,20 C28,36 50,36 50,20";

export function InfinityStroke(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="infinity-stroke">
      <svg viewBox="0 0 100 40" aria-hidden="true">
        <path data-ui-infinity="track" d={INFINITY_PATH} pathLength={100} />
        <path data-ui-infinity="stroke" d={INFINITY_PATH} pathLength={100} />
      </svg>
      {children}
    </span>
  );
}

export function MorphSquare(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="morph-square">
      {children}
    </span>
  );
}

export function CometArc(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="comet-arc">
      <span data-ui-animation="comet-sweep">
        <span data-ui-animation="comet-trail" />
        <span data-ui-animation="comet-tip" />
      </span>
      {children}
    </span>
  );
}

export function HelixDots(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="helix-dots">
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          data-ui-animation="helix-pair"
          style={{ "--delay": `${index * 0.32}s` } as CSSProperties}
        >
          <span data-ui-helix="a" />
          <span data-ui-helix="bridge" />
          <span data-ui-helix="b" />
        </span>
      ))}
      {children}
    </span>
  );
}

export function ParticleBurst(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="particle-burst">
      <span data-ui-animation="burst-core" />
      {Array.from({ length: 8 }, (_, index) => (
        <span
          key={index}
          data-ui-animation="burst-particle"
          style={{ "--angle": `${index * 45}deg`, "--delay": `${index * 0.08}s` } as CSSProperties}
        />
      ))}
      {children}
    </span>
  );
}

export function HelixRings(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="helix-rings">
      <span data-ui-helix-ring="x" />
      <span data-ui-helix-ring="y" />
      {children}
    </span>
  );
}

export function GradientSweep(props: DivProps): ReactNode {
  const { children, ...boxProps } = props;
  return (
    <div {...boxProps} data-ui-animation="gradient-sweep">
      {children}
    </div>
  );
}

export function BorderBeam(props: DivProps): ReactNode {
  const { children, ...boxProps } = props;
  return (
    <div {...boxProps} data-ui-animation="border-beam">
      <span data-ui-animation="beam-spark" aria-hidden />
      {children}
    </div>
  );
}

export function HueOutline(props: DivProps): ReactNode {
  const { children, ...boxProps } = props;
  return (
    <div {...boxProps} data-ui-animation="hue-outline">
      {children}
    </div>
  );
}

const cloudDots: ReadonlyArray<readonly [number, number]> = [
  [50, 16], [74, 26], [86, 50], [74, 74], [50, 84], [26, 74], [14, 50], [26, 26],
  [50, 36], [64, 50], [50, 64], [36, 50],
  [62, 22], [78, 40], [78, 62], [62, 80], [38, 80], [22, 62], [22, 40], [38, 22],
];

export function MassOrb(props: SpanProps): ReactNode {
  const { announce, label, children, ...spanProps } = props;
  return (
    <span {...spanProps} {...statusProps(announce, label)} data-ui-animation="mass-orb">
      <span data-ui-animation="mass-glow" />
      <span data-ui-animation="mass-core" />
      <span data-ui-animation="mass-sheen" />
      {children}
    </span>
  );
}

export function BlobMass(props: DivProps): ReactNode {
  return (
    <div {...props} data-ui-animation="blob-mass" aria-hidden={props["aria-hidden"] ?? true}>
      <span data-ui-blob="a" />
      <span data-ui-blob="b" />
      <span data-ui-blob="c" />
    </div>
  );
}

export function AuroraMass(props: DivProps): ReactNode {
  return (
    <div {...props} data-ui-animation="aurora-mass" aria-hidden={props["aria-hidden"] ?? true}>
      <span data-ui-aurora="a" />
      <span data-ui-aurora="b" />
      <span data-ui-aurora="c" />
    </div>
  );
}

export function RingMass(props: DivProps): ReactNode {
  return (
    <div {...props} data-ui-animation="ring-mass" aria-hidden={props["aria-hidden"] ?? true}>
      <span data-ui-ring-mass="1" />
      <span data-ui-ring-mass="2" />
      <span data-ui-ring-mass="3" />
      <span data-ui-ring-mass="4" />
    </div>
  );
}

export function CloudMass(props: DivProps): ReactNode {
  return (
    <div {...props} data-ui-animation="cloud-mass" aria-hidden={props["aria-hidden"] ?? true}>
      {cloudDots.map(([x, y], index) => (
        <span
          key={`${x}-${y}`}
          data-ui-animation="cloud-dot"
          style={{ "--x": `${x}%`, "--y": `${y}%`, "--i": index } as CSSProperties}
        />
      ))}
    </div>
  );
}
