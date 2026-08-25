import type { FileCandidate } from "@interactive-os/json-document-file-intake";

export interface WebFileCandidate {
  readonly name: string;
  readonly size: number;
  readonly type: string;
}

export interface WebFileCandidateList {
  readonly length: number;
  readonly [index: number]: WebFileCandidate;
}

export interface WebFileClipboardEvent {
  readonly clipboardData: { readonly files: WebFileCandidateList } | null;
}

export function fileCandidateFromWebFile(file: WebFileCandidate): FileCandidate {
  return { name: file.name, size: file.size, mediaType: file.type || null };
}

export function fileCandidatesFromWebFiles(files: WebFileCandidateList | ReadonlyArray<WebFileCandidate>): ReadonlyArray<FileCandidate> {
  return Array.from(files as ArrayLike<WebFileCandidate>, fileCandidateFromWebFile);
}

export function fileCandidatesFromWebClipboard(event: WebFileClipboardEvent): ReadonlyArray<FileCandidate> {
  return event.clipboardData === null ? [] : fileCandidatesFromWebFiles(event.clipboardData.files);
}

/** @deprecated Use fileCandidateFromWebFile. */
export const composerAttachmentCandidateFromWebFile = fileCandidateFromWebFile;
/** @deprecated Use fileCandidatesFromWebFiles. */
export const composerAttachmentCandidatesFromWebFiles = fileCandidatesFromWebFiles;
/** @deprecated Use fileCandidatesFromWebClipboard. */
export const composerAttachmentCandidatesFromWebClipboard = fileCandidatesFromWebClipboard;

/** @deprecated Use WebFileCandidate. */
export type WebComposerFile = WebFileCandidate;
/** @deprecated Use WebFileCandidateList. */
export type WebComposerFileList = WebFileCandidateList;
/** @deprecated Use WebFileClipboardEvent. */
export type WebComposerClipboardEvent = WebFileClipboardEvent;
