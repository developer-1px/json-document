import type { ComposerAttachmentCandidate } from "@interactive-os/json-document-composer";

export interface WebComposerFile {
  readonly name: string;
  readonly size: number;
  readonly type: string;
}

export interface WebComposerFileList {
  readonly length: number;
  readonly [index: number]: WebComposerFile;
}

export interface WebComposerClipboardEvent {
  readonly clipboardData: { readonly files: WebComposerFileList } | null;
}

export function composerAttachmentCandidateFromWebFile(file: WebComposerFile): ComposerAttachmentCandidate {
  return { name: file.name, size: file.size, mediaType: file.type || null };
}

export function composerAttachmentCandidatesFromWebFiles(files: WebComposerFileList | ReadonlyArray<WebComposerFile>): ReadonlyArray<ComposerAttachmentCandidate> {
  return Array.from(files, composerAttachmentCandidateFromWebFile);
}

export function composerAttachmentCandidatesFromWebClipboard(event: WebComposerClipboardEvent): ReadonlyArray<ComposerAttachmentCandidate> {
  return event.clipboardData === null ? [] : composerAttachmentCandidatesFromWebFiles(event.clipboardData.files);
}
