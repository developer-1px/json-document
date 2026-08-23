export const annotationSource = {
  id: "cat-enter",
  src: "/cat-enter.png",
  width: 1200,
  height: 800,
} as const;

export type PointTarget = {
  readonly type: "point";
  readonly x: number;
  readonly y: number;
};

export type RectangleTarget = {
  readonly type: "rectangle";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type AnnotationTarget = PointTarget | RectangleTarget;

export type AnnotationMark =
  | { readonly type: "marker" }
  | { readonly type: "rectangle" }
  | {
    readonly type: "arrow";
    readonly from: PointTarget;
    readonly to: PointTarget;
  };

export type RasterAnnotation = {
  readonly id: string;
  readonly target: AnnotationTarget;
  readonly body: { readonly instruction: string };
  readonly mark: AnnotationMark;
};

export type AnnotationDocument = {
  readonly version: 1;
  readonly source: typeof annotationSource;
  readonly annotations: ReadonlyArray<RasterAnnotation>;
};

export type AnnotationSnapshot = {
  readonly document: AnnotationDocument;
  readonly selectedId: string | null;
};

export const initialAnnotationSnapshot: AnnotationSnapshot = {
  document: {
    version: 1,
    source: annotationSource,
    annotations: [],
  },
  selectedId: null,
};

export function serializeAnnotationSnapshot(snapshot: AnnotationSnapshot): string {
  return JSON.stringify(snapshot);
}

export function restoreAnnotationSnapshot(serialized: string): AnnotationSnapshot {
  const value = JSON.parse(serialized) as AnnotationSnapshot;
  if (value.document.version !== 1 || value.document.source.id !== annotationSource.id) {
    throw new Error("Unsupported annotation document");
  }
  return value;
}

export async function renderAnnotationImage(
  snapshot: AnnotationSnapshot,
  sourceUrl: string,
): Promise<string> {
  const image = await loadImage(sourceUrl);
  const canvas = document.createElement("canvas");
  canvas.width = snapshot.document.source.width;
  canvas.height = snapshot.document.source.height;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("Canvas rendering is unavailable");

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const accent = semanticColor("--color-border-accent");
  context.strokeStyle = accent;
  context.fillStyle = accent;
  context.lineWidth = 8;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.font = "700 30px system-ui, sans-serif";

  snapshot.document.annotations.forEach((annotation, index) => {
    drawMark(context, annotation, index + 1, accent);
  });
  return canvas.toDataURL("image/png");
}

function drawMark(
  context: CanvasRenderingContext2D,
  annotation: RasterAnnotation,
  number: number,
  accent: string,
) {
  if (annotation.mark.type === "marker" && annotation.target.type === "point") {
    context.save();
    context.translate(annotation.target.x + 20, annotation.target.y + 20);
    context.rotate(Math.PI / 4);
    context.fillRect(-11, -11, 22, 22);
    context.restore();
    context.beginPath();
    context.arc(annotation.target.x, annotation.target.y, 28, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "white";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(number), annotation.target.x, annotation.target.y + 1);
    context.fillStyle = accent;
    return;
  }

  if (annotation.mark.type === "rectangle" && annotation.target.type === "rectangle") {
    context.strokeRect(
      annotation.target.x,
      annotation.target.y,
      annotation.target.width,
      annotation.target.height,
    );
    return;
  }

  if (annotation.mark.type === "arrow") {
    drawArrow(context, annotation.mark.from, annotation.mark.to);
  }
}

function drawArrow(
  context: CanvasRenderingContext2D,
  from: PointTarget,
  to: PointTarget,
) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const head = 28;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.moveTo(to.x, to.y);
  context.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
  context.moveTo(to.x, to.y);
  context.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6));
  context.stroke();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });
}

function semanticColor(property: string): string {
  const channels = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  return ["rgb", "(", channels, ")"].join("");
}
