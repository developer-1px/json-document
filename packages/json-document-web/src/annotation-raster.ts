import type { Annotation, AnnotationDocument, AnnotationPoint } from "@interactive-os/json-document-editing";

export interface WebAnnotationRasterStyle {
  readonly stroke: string;
  readonly fill: string;
  readonly lineWidth: number;
  readonly labelFont: string;
}

export type WebAnnotationRasterResult =
  | { readonly ok: true; readonly dataURL: string }
  | { readonly ok: false; readonly code: "raster.decode-failed" | "raster.context-unavailable" | "raster.encode-failed"; readonly reason?: string };

export async function renderWebAnnotationRaster(options: {
  readonly document: AnnotationDocument;
  readonly sourceId: string;
  readonly sourceURL: string;
  readonly style: WebAnnotationRasterStyle;
}): Promise<WebAnnotationRasterResult> {
  const source = options.document.sources.find((item) => item.id === options.sourceId);
  if (!source) return { ok: false, code: "raster.decode-failed", reason: "Annotation source was not found" };
  const image = await loadImage(options.sourceURL);
  if (image === null) return { ok: false, code: "raster.decode-failed" };
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (context === null) return { ok: false, code: "raster.context-unavailable" };
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  applyStyle(context, options.style);
  options.document.annotations
    .filter((annotation) => annotation.target.sourceId === source.id)
    .forEach((annotation, index) => drawAnnotation(context, annotation, index + 1, options.style));
  try { return { ok: true, dataURL: canvas.toDataURL("image/png") }; } catch (error) {
    return { ok: false, code: "raster.encode-failed", reason: message(error) };
  }
}

function loadImage(sourceURL: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = sourceURL;
  });
}

function applyStyle(context: CanvasRenderingContext2D, style: WebAnnotationRasterStyle) {
  context.strokeStyle = style.stroke;
  context.fillStyle = style.fill;
  context.lineWidth = style.lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.font = style.labelFont;
}

function drawAnnotation(context: CanvasRenderingContext2D, annotation: Annotation, number: number, style: WebAnnotationRasterStyle) {
  const selector = annotation.target.selector;
  if (annotation.presentation.type === "marker" && selector.type === "point") {
    drawCommentBubble(context, selector);
    context.fillStyle = "white"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(String(number), selector.x, selector.y + 1); context.fillStyle = style.fill;
    return;
  }
  if (annotation.presentation.type === "reaction" && selector.type === "point") {
    drawReaction(context, selector, annotation.presentation.reaction, style);
    return;
  }
  if (annotation.presentation.type === "outline" && selector.type === "rectangle") { context.strokeRect(selector.x, selector.y, selector.width, selector.height); return; }
  if (annotation.presentation.type === "stroke" && selector.type === "path") { drawStroke(context, selector.points); return; }
  if (annotation.presentation.type === "arrow" && selector.type === "arrow") drawArrow(context, selector.from, selector.to);
}

function drawCommentBubble(context: CanvasRenderingContext2D, point: AnnotationPoint) {
  const { x, y } = point;
  context.beginPath(); context.moveTo(x, y - 28);
  context.bezierCurveTo(x + 15.5, y - 28, x + 28, y - 15.5, x + 28, y);
  context.lineTo(x + 28, y + 28); context.lineTo(x, y + 28);
  context.bezierCurveTo(x - 15.5, y + 28, x - 28, y + 15.5, x - 28, y);
  context.bezierCurveTo(x - 28, y - 15.5, x - 15.5, y - 28, x, y - 28);
  context.closePath(); context.fill();
}

function drawReaction(context: CanvasRenderingContext2D, point: AnnotationPoint, reaction: "like" | "dislike", style: WebAnnotationRasterStyle) {
  const direction = reaction === "like" ? -1 : 1;
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.24)"; context.shadowBlur = 6; context.shadowOffsetY = 4;
  context.beginPath(); context.arc(point.x, point.y, 29, 0, Math.PI * 2); context.fillStyle = "white"; context.fill(); context.strokeStyle = "white"; context.lineWidth = 9; context.stroke();
  context.shadowColor = "transparent";
  context.beginPath(); context.arc(point.x, point.y, 28, 0, Math.PI * 2); context.strokeStyle = style.stroke; context.lineWidth = 3; context.stroke();
  context.translate(point.x, point.y); context.scale(1, direction);
  context.beginPath();
  context.moveTo(-13, -2); context.lineTo(-7, -2); context.lineTo(-3, -13); context.quadraticCurveTo(-1, -17, 3, -14);
  context.lineTo(3, -7); context.lineTo(12, -7); context.quadraticCurveTo(16, -7, 15, -2);
  context.lineTo(12, 10); context.quadraticCurveTo(11, 14, 7, 14); context.lineTo(-7, 14); context.lineTo(-7, -2);
  context.moveTo(-13, -2); context.lineTo(-13, 14); context.lineTo(-7, 14);
  context.stroke();
  context.restore();
}

function drawStroke(context: CanvasRenderingContext2D, points: ReadonlyArray<AnnotationPoint>) {
  const first = points[0]; if (!first) return; context.beginPath(); context.moveTo(first.x, first.y);
  if (points.length === 2) { const last = points[1]; if (last) context.lineTo(last.x, last.y); }
  else {
    points.slice(1, -1).forEach((point, index) => {
      const next = points[index + 2] ?? point;
      context.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    });
    const last = points.at(-1); if (last) context.lineTo(last.x, last.y);
  }
  context.stroke();
}

function drawArrow(context: CanvasRenderingContext2D, from: AnnotationPoint, to: AnnotationPoint) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x); const head = 28;
  context.beginPath(); context.moveTo(from.x, from.y); context.lineTo(to.x, to.y);
  context.moveTo(to.x, to.y); context.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
  context.moveTo(to.x, to.y); context.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6)); context.stroke();
}

function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
