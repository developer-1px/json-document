import { useState, type ButtonHTMLAttributes, type HTMLAttributes, type PointerEvent, type ReactNode, type TdHTMLAttributes } from "react";
import { createWebPointerSession } from "@interactive-os/json-document-web";

export function FileDropRegion(props: Omit<HTMLAttributes<HTMLDivElement>, "onDrop"> & {
  readonly onFiles: (files: ReadonlyArray<File>) => void;
  readonly overlay?: ReactNode;
}) {
  const { children, overlay, onFiles, ...regionProps } = props;
  const [active, setActive] = useState(false);
  return (
    <div {...regionProps} data-ui-primitive="file-drop-region" data-drop-active={active || undefined} onDragEnter={(event) => { event.preventDefault(); setActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActive(false); }} onDrop={(event) => { event.preventDefault(); setActive(false); onFiles(Array.from(event.dataTransfer.files)); }}>
      {active ? overlay : null}
      {children}
    </div>
  );
}

export function GridCell(props: TdHTMLAttributes<HTMLTableCellElement> & {
  readonly selected: boolean;
  readonly focus?: boolean;
}) {
  const { selected, focus = false, ...cellProps } = props;
  return <td {...cellProps} role="gridcell" aria-selected={selected} data-selected={selected || undefined} data-focus={focus || undefined} />;
}

export function ResizeHandle(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "onResize"> & {
  readonly label: string;
  readonly orientation: "horizontal" | "vertical";
  readonly onResize: (delta: number, phase: "preview" | "commit") => void;
  readonly className?: string;
}) {
  const { label, orientation, onResize, className, ...buttonProps } = props;
  const [session] = useState(() => createWebPointerSession<{ readonly position: number }>());
  const position = (event: PointerEvent) => orientation === "horizontal" ? event.clientX : event.clientY;
  return <button {...buttonProps} type="button" aria-label={label} data-ui-primitive="resize-handle" className={className} style={{ ...buttonProps.style, cursor: orientation === "horizontal" ? "col-resize" : "row-resize" }} onPointerDown={(event) => { event.stopPropagation(); session.begin(event.currentTarget, event.pointerId, { position: position(event) }); }} onPointerMove={(event) => { event.stopPropagation(); const active = session.getSnapshot(); if (active?.pointerId === event.pointerId) onResize(position(event) - active.state.position, "preview"); }} onPointerUp={(event) => { event.stopPropagation(); const active = session.commit(event.pointerId); if (active) onResize(position(event) - active.position, "commit"); }} onPointerCancel={(event) => { event.stopPropagation(); session.cancel(event.pointerId); }} onLostPointerCapture={(event) => { session.cancel(event.pointerId, "lost-capture"); }} />;
}
