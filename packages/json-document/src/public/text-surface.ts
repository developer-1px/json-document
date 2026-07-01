// Advanced text surface entrypoint.
// Use when adapting rich text or contenteditable surfaces to document patches.

export {
  replaceTextSurfaceSelection,
  syncTextSurfaceMutation,
  textSurfaceFragment,
} from "../domain/text-surface/surface.js";
export type {
  TextSurface,
  TextSurfaceAtom,
  TextSurfaceError,
  TextSurfaceErrorCode,
  TextSurfaceFragment,
  TextSurfaceFragmentResult,
  TextSurfaceMutationRange,
  TextSurfaceMutationResult,
  TextSurfaceRange,
  TextSurfaceReplaceOptions,
  TextSurfaceReplaceResult,
  TextSurfaceReplacement,
  TextSurfaceSelectionRange,
} from "../domain/text-surface/surface.js";
