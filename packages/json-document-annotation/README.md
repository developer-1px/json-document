# @interactive-os/json-document-annotation

`AnnotationHand` is the canonical React interaction surface for raster
annotations. Editing owns the persistent document and selector transforms;
the Hand owns tools, gesture-to-Intent orchestration, SVG projection,
transient previews, resize handles, and comment UI.

```tsx
import { AnnotationHand } from "@interactive-os/json-document-annotation";

<AnnotationHand
  editor={editor}
  tool={tool}
  onToolChange={setTool}
  sourceUrl={sourceUrl}
  createId={() => crypto.randomUUID()}
  rasterStyle={rasterStyle}
/>
```

The Host owns the active `tool` and injects `onToolChange`, IDs, enabled tools,
copy, class names, `reactionShadow`, raster style, and the
concrete source URL. The serialized output remains an `AnnotationDocument`;
selection and history stay in the editor snapshot.


`useAnnotationOutput({ document, editor, sourceUrl, rasterStyle, renderImage })`
provides `structured`, `structuredDownloadUrl`, `renderedImage`, `imageError`,
`canRestore`, `save()` and `restore()`. Pass the same Core `document` instance
used to create `editor`. `save()` retains an immutable document snapshot;
`restore()` uses a Core commit and clears selection, returning whether it
succeeded. This is external document replacement, so the editor's external
history policy applies. A saved snapshot cannot be restored into a different
Core document instance. Image rendering is lazy and ignores stale completions.
The Host composes its own output tabs, copyable code display and download links.

The Hand uses Key Selection through Editing, `useInteractionHandle` for move
and resize, Web pointer capture for creation, and the Web keyboard resolver for
Undo/Redo/Delete. Tool shortcuts are plain V/C/D/A/L/K; modified shortcuts and
IME composition do not choose a tool. Preview and commit both consume Editing's
`transformAnnotationSelector`.

### Annotating rendered content

`AnnotationHand.content` accepts SVG content behind the annotation layer instead
of a raster image. The Hand retains ownership of gestures, selectors and projection.
Raster download is omitted when content is supplied. `toolLabels` overrides product
copy. `renderCommentComposer({annotation,submit,cancel})` composes a canonical
Composer (including optional speech input); `onSubmitAnnotation` receives the
committed instruction for queuing. `onAnnotationCreated` observes a new mark.
Usage: [Slides](/applications/slides) overlays HTML pages and submits to
`createAnnotationReviewQueue`. Source dimensions must match the supplied content.

## AnnotationReview: one complete review surface

`AnnotationReview` owns marking, text/optional speech instructions, enqueueing,
source/result switching, completion and continuation on the confirmed revision.
It consumes `createAnnotationReviewSession` and `createAnnotationReviewQueue`
from Editing; it never calls an agent provider directly. Connect one queue worker
at the application boundary. A failed worker remains retryable; completed tasks
remain in collapsed history. A draft prevents automatic result switching.

```tsx
import { AnnotationReview, AnnotationReviewGroup } from "@interactive-os/json-document-annotation";
import "@interactive-os/json-document-annotation/annotation-review.css";
import { createAnnotationReviewSession, createAnnotationReviewQueue } from "@interactive-os/json-document-editing";

// Keep these instances stable; connect/disconnect the queue worker with your runtime.
const session = createAnnotationReviewSession({ id: "page", source, width: 960, height: 540 });
const queue = createAnnotationReviewQueue();
const disconnect = queue.connect(runReview); // (task, cancellation) => Promise<updated source>

<AnnotationReviewGroup>
  <AnnotationReview session={session} queue={queue} liveSource={source}
    title="Page 1" label="Page 1 review" createId={() => crypto.randomUUID()}
    speechInput={{ lang: "ko-KR" }} renderContent={renderSVGContent} />
</AnnotationReviewGroup>;
```

`renderContent` receives the exact frozen or result source, and returns SVG
children in the session's coordinate space. It must not mutate the live source.
`liveSource` is supplied by the authoritative content model; the worker updates
that model before returning its result. `AnnotationReviewGroup` coordinates one
visible composer across multiple pages; omit it for a single surface. Storage
and provider credentials remain outside this UI. `canvasLabel` and `className`
customize accessibility naming and product placement.

The [Annotation Usage](/demo/annotation) includes a deterministic SVG text worker;
[Slides](/applications/slides) uses the same UI with the real agent and HTML content.
`AnnotationHand.onCommentEditingChange` observes opening, reopening, cancellation
and tool changes, so a consumer never has to infer composer activity from mark creation.

Continuous voice review: use `AnnotationReviewGroup` with `following={{ queue, createId, lang }}` around review surfaces. See the package API reference and Annotation Review Usage on the site.
