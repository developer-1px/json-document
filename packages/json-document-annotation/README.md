# @interactive-os/json-document-annotation

`AnnotationHand` is the canonical React interaction surface for raster
annotations. Editing owns the persistent document and selector transforms;
the Hand owns tools, gesture-to-Intent orchestration, SVG projection,
transient previews, resize handles, and comment UI.

```tsx
import { AnnotationHand } from "@interactive-os/json-document-annotation";

<AnnotationHand
  editor={editor}
  sourceUrl={sourceUrl}
  createId={() => crypto.randomUUID()}
  rasterStyle={rasterStyle}
/>
```

The Host injects IDs, enabled tools, copy, class names, raster style, and the
concrete source URL. The serialized output remains an `AnnotationDocument`;
selection and history stay in the editor snapshot.
