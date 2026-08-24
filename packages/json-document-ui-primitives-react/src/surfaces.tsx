import { useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type PointerEvent, type ReactNode, type TdHTMLAttributes } from "react";

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
  const origin = useRef<{ readonly pointerId: number; readonly position: number } | null>(null);
  const position = (event: PointerEvent) => orientation === "horizontal" ? event.clientX : event.clientY;
  return <button {...buttonProps} type="button" aria-label={label} data-ui-primitive="resize-handle" className={className} style={{ ...buttonProps.style, cursor: orientation === "horizontal" ? "col-resize" : "row-resize" }} onPointerDown={(event) => { event.stopPropagation(); origin.current = { pointerId: event.pointerId, position: position(event) }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { event.stopPropagation(); if (origin.current?.pointerId === event.pointerId) onResize(position(event) - origin.current.position, "preview"); }} onPointerUp={(event) => { event.stopPropagation(); if (origin.current?.pointerId !== event.pointerId) return; onResize(position(event) - origin.current.position, "commit"); origin.current = null; }} />;
}
