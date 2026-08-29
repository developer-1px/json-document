import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import {
  AuroraMass,
  BlobMass,
  BorderBeam,
  CloudMass,
  CometArc,
  DualRings,
  EqualizerBars,
  FadeSpokes,
  GradientSweep,
  HelixDots,
  HelixRings,
  HueOutline,
  InfinityStroke,
  LoadingBar,
  MassOrb,
  MorseCode,
  MorphSquare,
  OrbitDots,
  ParticleBurst,
  ProgressRing,
  PulsingDot,
  PulsingOrb,
  RadarSweep,
  RingMass,
  Shimmer,
  ShimmerText,
  Skeleton,
  StaggerLines,
  StreamingCaret,
  WaveDots,
  WaveGrid,
} from "../src/index.js";

afterEach(cleanup);

describe("wait animation visuals", () => {
  test("projects each visual through a stable data-ui-animation hook", () => {
    render(
      <>
        <ShimmerText>Thinking…</ShimmerText>
        <ShimmerText tone="spectrum">Listening…</ShimmerText>
        <Shimmer data-testid="shimmer" />
        <Skeleton data-testid="skeleton-line" />
        <Skeleton shape="avatar" data-testid="skeleton-avatar" />
        <Skeleton shape="block" data-testid="skeleton-block" />
        <StaggerLines data-testid="stagger" lines={3} />
        <StreamingCaret data-testid="caret" />
        <WaveDots data-testid="wave" />
        <WaveDots data-testid="bubble" frame="bubble" />
        <WaveGrid data-testid="grid" />
        <PulsingDot data-testid="pulse" />
        <PulsingOrb data-testid="orb" />
        <MorseCode data-testid="morse" />
        <OrbitDots data-testid="orbit" />
        <EqualizerBars data-testid="eq" />
        <LoadingBar data-testid="bar" />
        <ProgressRing data-testid="ring" />
        <DualRings data-testid="dual" />
        <FadeSpokes data-testid="spokes" />
        <RadarSweep data-testid="radar" />
        <InfinityStroke data-testid="infinity" />
        <MorphSquare data-testid="morph" />
        <CometArc data-testid="comet" />
        <HelixDots data-testid="helix" />
        <ParticleBurst data-testid="burst" />
        <HelixRings data-testid="helix-rings" />
        <GradientSweep data-testid="sweep">Draft</GradientSweep>
        <BorderBeam data-testid="beam">Beam</BorderBeam>
        <HueOutline data-testid="hue">Hue</HueOutline>
        <MassOrb data-testid="mass-orb" />
        <BlobMass data-testid="blob" />
        <AuroraMass data-testid="aurora" />
        <RingMass data-testid="rings" />
        <CloudMass data-testid="cloud" />
      </>,
    );

    expect(screen.getByText("Thinking…").getAttribute("data-ui-shimmer")).toBe("mono");
    expect(screen.getByText("Listening…").getAttribute("data-ui-shimmer")).toBe("spectrum");
    expect(screen.getByTestId("shimmer").getAttribute("data-ui-animation")).toBe("shimmer");
    expect(screen.getByTestId("skeleton-line").getAttribute("data-ui-skeleton")).toBe("line");
    expect(screen.getByTestId("skeleton-avatar").getAttribute("data-ui-skeleton")).toBe("avatar");
    expect(screen.getByTestId("skeleton-block").getAttribute("data-ui-skeleton")).toBe("block");
    expect(screen.getByTestId("stagger").querySelectorAll('[data-ui-animation="stagger-line"]')).toHaveLength(3);
    expect(screen.getByTestId("caret").getAttribute("data-ui-animation")).toBe("caret");
    expect(screen.getByTestId("wave").querySelectorAll('[data-ui-animation="dot"]')).toHaveLength(3);
    expect(screen.getByTestId("bubble").getAttribute("data-ui-frame")).toBe("bubble");
    expect(screen.getByTestId("grid").querySelectorAll('[data-ui-animation="wave-cell"]')).toHaveLength(23);
    expect(screen.getByTestId("beam").querySelector('[data-ui-animation="beam-spark"]')).toBeTruthy();
    expect(screen.getByTestId("pulse").getAttribute("data-ui-animation")).toBe("pulsing-dot");
    expect(screen.getByTestId("orb").querySelectorAll("[data-ui-animation]")).toHaveLength(3);
    expect(screen.getByTestId("morse").querySelectorAll('[data-ui-animation="morse-beat"]')).toHaveLength(4);
    expect(screen.getByTestId("orbit").querySelectorAll('[data-ui-animation="orbit-dot"]')).toHaveLength(6);
    expect(screen.getByTestId("eq").querySelectorAll('[data-ui-animation="eq-bar"]')).toHaveLength(5);
    expect(screen.getByTestId("bar").getAttribute("data-ui-animation")).toBe("loading-bar");
    expect(screen.getByTestId("ring").getAttribute("data-ui-animation")).toBe("progress-ring");
    expect(screen.getByTestId("dual").getAttribute("data-ui-animation")).toBe("dual-rings");
    expect(screen.getByTestId("dual").querySelectorAll('[data-ui-animation="dual-ring"]')).toHaveLength(2);
    expect(screen.getByTestId("spokes").getAttribute("data-ui-animation")).toBe("fade-spokes");
    expect(screen.getByTestId("spokes").querySelectorAll('[data-ui-animation="spoke"]')).toHaveLength(12);
    expect(screen.getByTestId("radar").getAttribute("data-ui-animation")).toBe("radar-sweep");
    expect(screen.getByTestId("radar").querySelector('[data-ui-animation="radar-beam"]')).toBeTruthy();
    expect(screen.getByTestId("infinity").getAttribute("data-ui-animation")).toBe("infinity-stroke");
    expect(screen.getByTestId("infinity").querySelector('[data-ui-infinity="stroke"]')).toBeTruthy();
    expect(screen.getByTestId("morph").getAttribute("data-ui-animation")).toBe("morph-square");
    expect(screen.getByTestId("comet").getAttribute("data-ui-animation")).toBe("comet-arc");
    expect(screen.getByTestId("comet").querySelector('[data-ui-animation="comet-tip"]')).toBeTruthy();
    expect(screen.getByTestId("helix").getAttribute("data-ui-animation")).toBe("helix-dots");
    expect(screen.getByTestId("helix").querySelectorAll('[data-ui-animation="helix-pair"]')).toHaveLength(5);
    expect(screen.getByTestId("burst").getAttribute("data-ui-animation")).toBe("particle-burst");
    expect(screen.getByTestId("burst").querySelectorAll('[data-ui-animation="burst-particle"]')).toHaveLength(8);
    expect(screen.getByTestId("helix-rings").getAttribute("data-ui-animation")).toBe("helix-rings");
    expect(screen.getByTestId("helix-rings").querySelectorAll("[data-ui-helix-ring]")).toHaveLength(2);
    expect(screen.getByTestId("sweep").getAttribute("data-ui-animation")).toBe("gradient-sweep");
    expect(screen.getByTestId("beam").getAttribute("data-ui-animation")).toBe("border-beam");
    expect(screen.getByTestId("hue").getAttribute("data-ui-animation")).toBe("hue-outline");
    expect(screen.getByTestId("mass-orb").querySelectorAll("[data-ui-animation]")).toHaveLength(3);
    expect(screen.getByTestId("blob").querySelectorAll("[data-ui-blob]")).toHaveLength(3);
    expect(screen.getByTestId("aurora").querySelectorAll("[data-ui-aurora]")).toHaveLength(3);
    expect(screen.getByTestId("rings").querySelectorAll("[data-ui-ring-mass]")).toHaveLength(4);
    expect(screen.getByTestId("cloud").querySelectorAll('[data-ui-animation="cloud-dot"]')).toHaveLength(20);
  });

  test("keeps decorative visuals hidden and opts status visuals into a live region", () => {
    render(
      <>
        <ShimmerText>Quiet</ShimmerText>
        <ShimmerText announce label="Thinking">Loud</ShimmerText>
        <Skeleton data-testid="skeleton" />
        <StreamingCaret data-testid="caret" />
        <WaveDots announce label="Generating" />
      </>,
    );

    expect(screen.getByText("Quiet").getAttribute("aria-hidden")).toBe("true");
    const status = screen.getByRole("status", { name: "Thinking" });
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByTestId("skeleton").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByTestId("caret").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("status", { name: "Generating" })).toBeTruthy();
  });
});
