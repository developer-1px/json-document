export type WebPressSource = "keyboard" | "pointer" | "virtual";

export type WebPressInteraction =
  | { readonly phase: "start" | "end"; readonly source: "keyboard"; readonly key: "Enter" | "Space" }
  | { readonly phase: "start" | "end"; readonly source: "pointer" }
  | { readonly phase: "cancel"; readonly source: "keyboard" | "pointer" }
  | { readonly phase: "activation"; readonly source: "virtual" };

export type WebPressInput = {
  readonly type: string;
  readonly key?: string;
  readonly button?: number;
  readonly detail?: number;
  readonly repeat?: boolean;
  readonly defaultPrevented?: boolean;
};

/** Translates Web event facts without assigning a product action to the press. */
export function pressInteractionFromWeb(input: WebPressInput): WebPressInteraction | null {
  if (input.defaultPrevented) return null;
  if (input.type === "click") {
    const primary = input.button === undefined || input.button === 0;
    return primary ? { phase: "activation", source: "virtual" } : null;
  }
  if (input.type === "pointercancel" || input.type === "lostpointercapture") {
    return { phase: "cancel", source: "pointer" };
  }
  if (input.type === "blur") return { phase: "cancel", source: "keyboard" };
  if (input.type === "pointerdown" || input.type === "pointerup") {
    if (input.button !== undefined && input.button !== 0) return null;
    return { phase: input.type === "pointerdown" ? "start" : "end", source: "pointer" };
  }
  if (input.type !== "keydown" && input.type !== "keyup") return null;
  const key = pressKey(input.key);
  if (key === null || (input.type === "keydown" && input.repeat)) return null;
  return {
    phase: input.type === "keydown" ? "start" : "end",
    source: "keyboard",
    key,
  };
}

function pressKey(key: string | undefined): "Enter" | "Space" | null {
  if (key === "Enter") return "Enter";
  if (key === " " || key === "Spacebar" || key === "Space") return "Space";
  return null;
}
