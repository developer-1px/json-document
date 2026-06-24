import {
  type JSONDocument,
  type SelectionSnap,
  type TextSurface,
  type TextSurfaceAtom,
  type TextSurfaceFragment,
  type TextSurfaceRange,
  textSurfaceFragment,
} from "@interactive-os/json-document";

export function selectedTextSurfaceFragment<T>(
  document: JSONDocument<T>,
  selection: SelectionSnap,
  surface: TextSurface,
): TextSurfaceFragment | null {
  const result = textSurfaceFragment(selection, document.value, surface);
  return result.ok && result.fragment.text.length > 0 ? result.fragment : null;
}

export function plainTextFromFragment(fragment: TextSurfaceFragment): string {
  return fragment.text;
}

export function isTextSurfaceFragment(value: unknown): value is TextSurfaceFragment {
  return (
    isRecord(value) &&
    typeof value.text === "string" &&
    isOptionalSidecarRecord(value.atoms, isTextSurfaceAtom) &&
    isOptionalSidecarRecord(value.ranges, isTextSurfaceRange)
  );
}

function isOptionalSidecarRecord<T>(
  value: unknown,
  isEntry: (entry: unknown) => entry is T,
): value is Record<string, T> | undefined {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return Object.values(value).every(isEntry);
}

function isTextSurfaceAtom(value: unknown): value is TextSurfaceAtom {
  return isRecord(value) && Number.isFinite(value.offset);
}

function isTextSurfaceRange(value: unknown): value is TextSurfaceRange {
  return (
    isRecord(value) &&
    Number.isFinite(value.start) &&
    Number.isFinite(value.end)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
