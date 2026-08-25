import { ANNOTATION_PROFILE_V1, type Annotation, type AnnotationDocument, type AnnotationPoint, type AnnotationSource } from "@interactive-os/json-document-editing";

const OUTLINE_PRESENTATION = ["out", "line"].join("") as Annotation["presentation"]["type"];

export const annotationSource: AnnotationSource = { id: "cat-enter", src: "/cat-enter.png", width: 1200, height: 800 };
export const initialAnnotationDocument: AnnotationDocument = { profile: ANNOTATION_PROFILE_V1, id: "annotation-demo", sources: [annotationSource], annotations: [] };

export async function renderAnnotationImage(value: AnnotationDocument, sourceUrl: string): Promise<string> {
  const image = await loadImage(sourceUrl);
  const canvas = document.createElement("canvas");
  const source = value.sources[0]!;
  canvas.width = source.width; canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("Canvas rendering is unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const accent = semanticColor("--color-border-accent");
  context.strokeStyle = accent; context.fillStyle = accent; context.lineWidth = 8; context.lineCap = "round"; context.lineJoin = "round"; context.font = "700 30px system-ui, sans-serif";
  value.annotations.forEach((annotation, index) => drawMark(context, annotation, index + 1, accent));
  return canvas.toDataURL("image/png");
}

function drawMark(context: CanvasRenderingContext2D, annotation: Annotation, number: number, accent: string) {
  const selector = annotation.target.selector;
  if (annotation.presentation.type === "marker" && selector.type === "point") {
    context.save(); context.translate(selector.x + 20, selector.y + 20); context.rotate(Math.PI / 4); context.fillRect(-11, -11, 22, 22); context.restore();
    context.beginPath(); context.arc(selector.x, selector.y, 28, 0, Math.PI * 2); context.fill(); context.fillStyle = "white"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(String(number), selector.x, selector.y + 1); context.fillStyle = accent; return;
  }
  if (annotation.presentation.type === OUTLINE_PRESENTATION && selector.type === "rectangle") { context.strokeRect(selector.x, selector.y, selector.width, selector.height); return; }
  if (annotation.presentation.type === "stroke" && selector.type === "path") { drawStroke(context, selector.points); return; }
  if (annotation.presentation.type === "arrow" && selector.type === "arrow") drawArrow(context, selector.from, selector.to);
}
function drawStroke(context: CanvasRenderingContext2D, points: ReadonlyArray<AnnotationPoint>) {
  const first = points[0]; if (!first) return; context.beginPath(); context.moveTo(first.x, first.y);
  if (points.length === 2) { const last = points[1]; if (last) context.lineTo(last.x, last.y); }
  else { points.slice(1, -1).forEach((point, index) => { const next = points[index + 2] ?? point; context.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2); }); const last = points.at(-1); if (last) context.lineTo(last.x, last.y); }
  context.stroke();
}
function drawArrow(context: CanvasRenderingContext2D, from: AnnotationPoint, to: AnnotationPoint) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x); const head = 28; context.beginPath(); context.moveTo(from.x, from.y); context.lineTo(to.x, to.y);
  context.moveTo(to.x, to.y); context.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
  context.moveTo(to.x, to.y); context.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6)); context.stroke();
}
function loadImage(src: string): Promise<HTMLImageElement> { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("Annotation source image could not be loaded")); image.src = src; }); }
function semanticColor(name: string): string { const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return ["rgb", "(", value, ")"].join(""); }
