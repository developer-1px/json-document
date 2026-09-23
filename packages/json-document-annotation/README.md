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
