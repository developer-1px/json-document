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
} from "@interactive-os/json-document-animation-react";
import "@interactive-os/json-document-animation-react/styles.css";
import type { ReactNode } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { animationDemo } from "./animation-demo-styles";

const styles = animationDemo();

function Specimen(props: { readonly title: string; readonly wide?: boolean; readonly mass?: boolean; readonly children: ReactNode }) {
  return (
    <section className={classes(styles.specimen(), props.wide ? styles.wide() : undefined)}>
      <h2 className={ui.text.label}>{props.title}</h2>
      <div className={classes(props.mass ? styles.massStage() : styles.stage(), ui.surface.raised)}>
        {props.children}
      </div>
    </section>
  );
}

function Group(props: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div className={styles.group()}>
      <h3 className={styles.groupTitle()}>{props.title}</h3>
      <div className={styles.grid()}>{props.children}</div>
    </div>
  );
}

export function AnimationDemoRoute() {
  return (
    <DemoPage documentation={(
      <PageHeader label="UI Primitives" title="Wait animation visuals" illustration="cursor">
        생성 대기의 시각 언어입니다. 상태 기계와 스트림 렌더는 여기 없습니다.
      </PageHeader>
    )}>
      <div className={styles.catalog()}>
        <Group title="Mass">
          <Specimen title="Mass orb">
            <MassOrb />
          </Specimen>
          <Specimen title="Ring mass">
            <RingMass />
          </Specimen>
          <Specimen title="Cloud mass">
            <CloudMass />
          </Specimen>
          <Specimen title="Blob mass" mass>
            <BlobMass className={styles.massFill()} />
          </Specimen>
          <Specimen title="Aurora mass" wide mass>
            <AuroraMass className={styles.massFill()} />
          </Specimen>
        </Group>
        <Group title="Status text">
          <Specimen title="Shimmer text">
            <ShimmerText>Thinking…</ShimmerText>
          </Specimen>
          <Specimen title="Spectrum shimmer">
            <ShimmerText tone="spectrum">Listening and transcribing…</ShimmerText>
          </Specimen>
        </Group>
        <Group title="Chat wait">
          <Specimen title="Wave dots">
            <WaveDots frame="bubble" />
          </Specimen>
          <Specimen title="Wave grid">
            <WaveGrid />
          </Specimen>
          <Specimen title="Streaming caret" wide>
            <span>
              Start with the user goal, then map the constraints
              <StreamingCaret />
            </span>
          </Specimen>
        </Group>
        <Group title="Processing">
          <Specimen title="Pulsing dot">
            <span className={styles.copy()}>
              <PulsingDot />
              Reviewing sources
            </span>
          </Specimen>
          <Specimen title="Morse code">
            <MorseCode />
          </Specimen>
          <Specimen title="Orbit dots">
            <OrbitDots />
          </Specimen>
          <Specimen title="Equalizer">
            <EqualizerBars />
          </Specimen>
          <Specimen title="Pulsing orb">
            <PulsingOrb />
          </Specimen>
          <Specimen title="Progress ring">
            <span className={styles.copy()}>
              <ProgressRing />
              Generating
            </span>
          </Specimen>
          <Specimen title="Dual rings">
            <span className={styles.copy()}>
              <DualRings />
              Working
            </span>
          </Specimen>
          <Specimen title="Fade spokes">
            <span className={styles.copy()}>
              <FadeSpokes />
              Busy
            </span>
          </Specimen>
          <Specimen title="Radar sweep">
            <span className={styles.copy()}>
              <RadarSweep />
              Searching
            </span>
          </Specimen>
          <Specimen title="Infinity stroke">
            <span className={styles.copy()}>
              <InfinityStroke />
              Syncing
            </span>
          </Specimen>
          <Specimen title="Morph square">
            <span className={styles.copy()}>
              <MorphSquare />
              Shaping
            </span>
          </Specimen>
          <Specimen title="Comet arc">
            <span className={styles.copy()}>
              <CometArc />
              Tracing
            </span>
          </Specimen>
          <Specimen title="Helix dots">
            <span className={styles.copy()}>
              <HelixDots />
              Pairing
            </span>
          </Specimen>
          <Specimen title="Particle burst">
            <span className={styles.copy()}>
              <ParticleBurst />
              Sparking
            </span>
          </Specimen>
          <Specimen title="Helix rings">
            <span className={styles.copy()}>
              <HelixRings />
              Gyroscope
            </span>
          </Specimen>
          <Specimen title="Loading bar" wide>
            <LoadingBar className={styles.bar()} />
          </Specimen>
        </Group>
        <Group title="Placeholders">
          <Specimen title="Skeleton">
            <div className={styles.bar()}>
              <div className={styles.copy()}>
                <Skeleton shape="avatar" />
                <div className="grid flex-1 gap-2">
                  <Skeleton className="w-1/3" />
                  <Skeleton className="w-2/3" />
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                <Skeleton shape="block" />
              </div>
            </div>
          </Specimen>
          <Specimen title="Stagger lines">
            <StaggerLines className={styles.bar()} />
          </Specimen>
          <Specimen title="Shimmer" wide>
            <Shimmer className={classes("h-12 w-full", ui.surface.workspace)} />
          </Specimen>
        </Group>
        <Group title="Identity rim">
          <Specimen title="Gradient sweep">
            <GradientSweep className={styles.identity()}>Generating a response</GradientSweep>
          </Specimen>
          <Specimen title="Border beam">
            <BorderBeam className={styles.identity()}>Working on it</BorderBeam>
          </Specimen>
          <Specimen title="Hue rim" wide>
            <HueOutline className={styles.identity()}>Spectrum rim</HueOutline>
          </Specimen>
        </Group>
      </div>
    </DemoPage>
  );
}
