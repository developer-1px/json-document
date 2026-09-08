/** Product-facing exposure grammar for a control in its current composition. */
export type ControlAffordance =
  | "persistent"
  | "content-control"
  | "stateful"
  | "contextual"
  | "contextual-danger"
  | "direct"
  | "field"
  | "disabled-preview";

export type ControlAffordanceProps = {
  /** Declares how a product theme reveals this control without changing its semantic role. */
  readonly affordance?: ControlAffordance;
};
