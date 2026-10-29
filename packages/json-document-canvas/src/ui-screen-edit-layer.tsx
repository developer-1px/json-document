import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import type { ObjectEditor } from "@interactive-os/json-document-editing";
import type { CanvasObject } from "@interactive-os/json-document-object-document";

export interface UIScreenEditBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export interface UIScreenEditLayerProps {
  readonly editor: ObjectEditor;
  readonly object: CanvasObject;
  readonly editable: boolean;
  /** Measured runtime geometry at entry; stable throughout this edit session. */
  readonly origin?: UIScreenEditBounds;
  readonly children: ReactNode;
}

const ScreenEditTranslation = createContext({x: 0, y: 0});
/** Viewport overlays consume the same world translation as their owning content object. */
export function useUIScreenEditTranslation(): {readonly x: number; readonly y: number} {
  return useContext(ScreenEditTranslation);
}
/** Passive HTML projection of canonical Canvas geometry; owns no selection or input. */
export function UIScreenEditLayer({ object, editable, origin, children }: UIScreenEditLayerProps) {
  const inherited = useContext(ScreenEditTranslation);
  const enabled = editable && origin !== undefined;
  const translation = enabled ? {x: object.x - origin.x, y: object.y - origin.y} : inherited;
  const dx = translation.x - inherited.x;
  const dy = translation.y - inherited.y;
  const contentStyle: CSSProperties | undefined = enabled ? {
    width: object.width, height: object.height,
    transform: dx || dy ? `translate(${dx}px, ${dy}px)` : undefined,
  } : undefined;
  return <div className="ui-screen-edit-layer" style={enabled ? { width: origin.width, height: origin.height } : undefined} data-ui-component-object={object.id}>
    <div className="ui-screen-edit-content" style={contentStyle}><ScreenEditTranslation.Provider value={translation}>{children}</ScreenEditTranslation.Provider></div>
  </div>;
}
