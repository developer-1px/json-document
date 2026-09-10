import type { JSONDocument } from "@interactive-os/json-document";
import { addComposerAttachments, createComposerAttachments, type ComposerAttachmentCandidate, type ComposerAttachmentPolicy, type ComposerDraft, type ComposerDraftCommandResult } from "@interactive-os/json-document-composer";
import { createEditingPreparationQueue, type EditingPreparation, type EditingPreparationFailure } from "@interactive-os/json-document-editing";
import { validateFileCandidates } from "@interactive-os/json-document-file-intake";
import type { RichTextEditor } from "@interactive-os/json-document-rich-text";
import { fileCandidatesFromWebFiles, readWebHTMLClipboard, readWebRasterFiles, type readWebRasterFile, type WebFileCandidate, type WebFileCandidateList, type WebHTMLClipboardContent } from "@interactive-os/json-document-web";
import { useEffect, useRef, useState } from "react";

/** Composer appends attachments, so typing and caret changes do not invalidate preparation. */
export function useComposerAttachments(document: JSONDocument, editor: RichTextEditor, options: {
  readonly policy: ComposerAttachmentPolicy;
  readonly createId: () => string;
  readonly maxImagePixels?: number;
  readonly readRaster?: typeof readWebRasterFile;
}) {
  const current = useRef(options);
  current.current = options;
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<EditingPreparationFailure | null>(null);
  const [queue] = useState(() => createEditingPreparationQueue<ReadonlyArray<ComposerAttachmentCandidate>, ComposerDraftCommandResult>({
    apply(candidates) {
      const draft = document.value as ComposerDraft;
      const created = createComposerAttachments(candidates, { createId: current.current.createId, policy: current.current.policy, currentCount: draft.attachments.length });
      return created.ok ? addComposerAttachments(editor, draft, created.attachments) : created;
    },
    onPendingChange: setPending,
    onResult: (result) => { setError(result.ok ? null : result); },
  }));
  useEffect(() => () => queue.cancel(), [queue]);

  function enqueue(prepare: (signal: AbortSignal) => EditingPreparation<ReadonlyArray<ComposerAttachmentCandidate>> | Promise<EditingPreparation<ReadonlyArray<ComposerAttachmentCandidate>>>) {
    setError(null);
    const controller = new AbortController();
    void queue.enqueue(() => prepare(controller.signal), () => controller.abort());
  }

  function addFiles(input: WebFileCandidateList | ReadonlyArray<WebFileCandidate>) {
    // Snapshot File references while a paste/drop event still owns them.
    const files = Array.from(input as ArrayLike<WebFileCandidate>);
    if (files.length === 0) return;
    const policy = current.current.policy;
    const maxImagePixels = current.current.maxImagePixels ?? 16_000_000;
    const readRaster = current.current.readRaster;
    enqueue((signal) => {
      const candidates = fileCandidatesFromWebFiles(files);
      const accepted = validateFileCandidates(candidates, policy, { currentCount: (document.value as ComposerDraft).attachments.length });
      if (!accepted.ok) return accepted;
      const images = files.filter((file) => file.type.startsWith("image/"));
      if (images.length === 0) return { ok: true, value: candidates };
      return readWebRasterFiles(images, { policy, maxImagePixels, signal, ...(readRaster ? { readRaster } : {}) }).then((prepared): EditingPreparation<ReadonlyArray<ComposerAttachmentCandidate>> => {
        if (!prepared.ok) return prepared;
        let imageIndex = 0;
        return { ok: true, value: candidates.map((candidate) => candidate.mediaType?.startsWith("image/")
          ? { ...candidate, image: prepared.files[imageIndex++]!.image }
          : candidate) };
      });
    });
  }

  function addHTML(content: WebHTMLClipboardContent) {
    const { policy, maxImagePixels = 16_000_000, readRaster } = current.current;
    enqueue((signal) => {
      if (content.parts.some((part) => part.type === "text" && part.text.trim())) return { ok: false, code: "composer.clipboard.mixed-unsupported" };
      return readWebHTMLClipboard(content, { policy, maxImagePixels, signal, currentCount: (document.value as ComposerDraft).attachments.length, ...(readRaster ? { readRaster } : {}) })
        .then((prepared): EditingPreparation<ReadonlyArray<ComposerAttachmentCandidate>> => prepared.ok
          ? { ok: true, value: prepared.parts.flatMap((part) => part.type === "image" ? [{ ...part.candidate, image: part.image }] : []) }
          : prepared);
    });
  }

  return { isPending, error, addFiles, addHTML, reportError: setError, cancel: () => { queue.cancel(); setError(null); }, hasPending: () => queue.isPending };
}
