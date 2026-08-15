export interface RichTextInstrumentSnapshot {
  readonly topologyCreates: number;
  readonly topologyAdopts: number;
  readonly topologyVisits: number;
  readonly visitedNodes: number;
  readonly fullValidations: number;
  readonly incrementalValidations: number;
  readonly fullValidationFallbacks: number;
}

export interface RichTextInstrument {
  topologyCreate(): void;
  topologyAdopt(): void;
  topologyVisit(): void;
  visitNode(): void;
  validate(mode: "full" | "incremental" | "full-fallback"): void;
  snapshot(): RichTextInstrumentSnapshot;
  reset(): void;
}

let active: RichTextInstrument | null = null;

export function createRichTextInstrument(): RichTextInstrument {
  const state = {
    topologyCreates: 0,
    topologyAdopts: 0,
    topologyVisits: 0,
    visitedNodes: 0,
    fullValidations: 0,
    incrementalValidations: 0,
    fullValidationFallbacks: 0,
  };
  return {
    topologyCreate() { state.topologyCreates += 1; },
    topologyAdopt() { state.topologyAdopts += 1; },
    topologyVisit() { state.topologyVisits += 1; },
    visitNode() { state.visitedNodes += 1; },
    validate(mode) {
      if (mode === "full") state.fullValidations += 1;
      else if (mode === "incremental") state.incrementalValidations += 1;
      else state.fullValidationFallbacks += 1;
    },
    snapshot() { return { ...state }; },
    reset() {
      state.topologyCreates = 0;
      state.topologyAdopts = 0;
      state.topologyVisits = 0;
      state.visitedNodes = 0;
      state.fullValidations = 0;
      state.incrementalValidations = 0;
      state.fullValidationFallbacks = 0;
    },
  };
}

export function getActiveRichTextInstrument(): RichTextInstrument | null {
  return active;
}

export function runWithRichTextInstrument<Value>(instrument: RichTextInstrument, run: () => Value): Value {
  const previous = active;
  active = instrument;
  try {
    return run();
  } finally {
    active = previous;
  }
}
