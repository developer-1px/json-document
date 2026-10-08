export interface WebTextMeasurement {
  readonly text: string;
  readonly width: number;
  readonly widthMode?: "auto" | "fixed";
  readonly fontSize: number;
  readonly fontWeight: number;
}

/** Uses native line breaking in unscaled CSS pixels, including explicit/trailing newlines. */
export function measureWebText(text: WebTextMeasurement): { width: number; height: number } {
  const element = document.createElement("div");
  Object.assign(element.style, {
    position: "fixed", left: "0", top: "0", visibility: "hidden", pointerEvents: "none",
    width: text.widthMode === "auto" ? "max-content" : `${text.width}px`, height: "auto",
    minWidth: "1px", padding: "0", margin: "0", border: "0", boxSizing: "content-box",
    fontFamily: getComputedStyle(document.body).fontFamily, fontSize: `${text.fontSize}px`, fontWeight: String(text.fontWeight),
    lineHeight: "1.2", letterSpacing: "normal", whiteSpace: text.widthMode === "auto" ? "pre" : "pre-wrap", overflowWrap: "anywhere",
  });
  element.textContent = text.text + "\u200b";
  document.body.append(element);
  try {
    const rect = element.getBoundingClientRect();
    // Round up to avoid fractional glyph clipping and accidental rewrapping.
    return { width: Math.max(1, Math.ceil(rect.width)), height: Math.max(text.fontSize * 1.2, Math.ceil(rect.height)) };
  } finally { element.remove(); }
}
