let blockRenderListener: ((nodeId: string) => void) | null = null;
let surfaceRenderListener: (() => void) | null = null;
let lastBlockScan = 0;

export function observeRichTextBlockRenders(listener: ((nodeId: string) => void) | null): void {
  blockRenderListener = listener;
}

export function observeRichTextSurfaceRenders(listener: (() => void) | null): void {
  surfaceRenderListener = listener;
}

export function lastRenderStoreBlockScan(): number {
  return lastBlockScan;
}

export function recordRichTextBlockRender(nodeId: string): void {
  blockRenderListener?.(nodeId);
}

export function recordRichTextSurfaceRender(): void {
  surfaceRenderListener?.();
}

export function recordRenderStoreBlockScan(blocks: number): void {
  lastBlockScan = blocks;
}
