import { useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type HTMLAttributes, type PointerEvent, type ReactNode, type TdHTMLAttributes } from "react";
import {
  createInteractionHandleSession,
  interactionHandleCursor,
  type ControlHandleDescriptor,
  type DragHandleDescriptor,
  type InteractionHandleDescriptor,
  type InteractionHandleEvent,
  type ResizeHandleDescriptor,
} from "@interactive-os/json-document-affordance";
import { createWebPointerSession } from "@interactive-os/json-document-web";
import type { ControlAffordanceProps } from "./control-affordance.js";
import { contentInteractionAttributes } from "./content-interaction.js";

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
  readonly active?: boolean;
  readonly dragging?: boolean;
}) {
  const { active = false, dragging = false, selected, focus = false, ...cellProps } = props;
  return <td {...cellProps} {...contentInteractionAttributes({ role: "content", selected, active, dragging })} role="gridcell" aria-selected={selected} data-focus={focus || undefined} />;
}

export type InteractionHandleBindingOptions<ElementType extends Element = HTMLElement> = {
  readonly descriptor: InteractionHandleDescriptor;
  readonly onHandle: (event: InteractionHandleEvent, input: PointerEvent<ElementType>) => void;
};

export function useInteractionHandle<ElementType extends Element = HTMLElement>(
  options: InteractionHandleBindingOptions<ElementType>,
) {
  const [pointer] = useState(() => createWebPointerSession<{ readonly active: true }>());
  const [interaction] = useState(() => createInteractionHandleSession());
  const [active, setActive] = useState(false);
  const stopNativeContinuation = useRef<(() => void) | null>(null);
  const sessionActive = active || interaction.getSnapshot() !== null;

  function point(event: PointerEvent<ElementType>) {
    return { x: event.clientX, y: event.clientY };
  }

  function finish(event: PointerEvent<ElementType>): InteractionHandleEvent | null {
    if (pointer.commit(event.pointerId) === null) return null;
    const result = interaction.commit(point(event));
    setActive(false);
    return result;
  }

  function nativeInput(event: globalThis.PointerEvent, target: ElementType): PointerEvent<ElementType> {
    return new Proxy(event, {
      get(source, property) {
        if (property === "currentTarget") return target;
        const value = Reflect.get(source, property, source) as unknown;
        return typeof value === "function" ? value.bind(source) : value;
      },
    }) as unknown as PointerEvent<ElementType>;
  }

  function continueOnWindow(target: ElementType): void {
    stopNativeContinuation.current?.();
    const stop = () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", cancel, true);
      if (stopNativeContinuation.current === stop) stopNativeContinuation.current = null;
    };
    const move = (event: globalThis.PointerEvent) => {
      if (pointer.getSnapshot()?.pointerId !== event.pointerId) return;
      event.stopPropagation();
      const input = nativeInput(event, target);
      const result = interaction.preview(point(input));
      if (result !== null) options.onHandle(result, input);
    };
    const up = (event: globalThis.PointerEvent) => {
      if (pointer.getSnapshot()?.pointerId !== event.pointerId) return;
      event.stopPropagation();
      const input = nativeInput(event, target);
      const result = finish(input);
      stop();
      if (result !== null) options.onHandle(result, input);
    };
    const cancel = (event: globalThis.PointerEvent) => {
      if (pointer.cancel(event.pointerId) === null) return;
      event.stopPropagation();
      const input = nativeInput(event, target);
      setActive(false);
      const result = interaction.cancel("cancel");
      stop();
      if (result !== null) options.onHandle(result, input);
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", cancel, true);
    stopNativeContinuation.current = stop;
  }

  return {
    active: sessionActive,
    cursor: interactionHandleCursor(options.descriptor, sessionActive ? "active" : "idle") as CSSProperties["cursor"],
    handleProps: {
      "data-interaction-handle": options.descriptor.kind,
      "data-active": sessionActive || undefined,
      onPointerDown(event: PointerEvent<ElementType>) {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const previous = pointer.getSnapshot();
        if (previous !== null) {
          pointer.cancel(previous.pointerId);
          const superseded = interaction.cancel("superseded");
          if (superseded !== null) options.onHandle(superseded, event);
        }
        pointer.begin(event.currentTarget, event.pointerId, { active: true });
        continueOnWindow(event.currentTarget);
        setActive(true);
        options.onHandle(interaction.start(options.descriptor, point(event)), event);
      },
      onLostPointerCapture(event: PointerEvent<ElementType>) {
        if (pointer.cancel(event.pointerId, "lost-capture") === null) return;
        stopNativeContinuation.current?.();
        setActive(false);
        const result = interaction.cancel("lost-capture");
        if (result !== null) options.onHandle(result, event);
      },
    },
  };
}

export type InteractionHandleButtonProps<Descriptor extends InteractionHandleDescriptor> =
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
    readonly label: string;
    readonly descriptor: Descriptor;
    readonly onHandle: (event: InteractionHandleEvent) => void;
  };

export type DragHandleProps = Omit<InteractionHandleButtonProps<DragHandleDescriptor>, "descriptor"> & {
  readonly descriptor?: DragHandleDescriptor;
};

export function DragHandle(props: DragHandleProps) {
  const { label, descriptor = { kind: "drag" }, onHandle, style, ...buttonProps } = props;
  const binding = useInteractionHandle<HTMLButtonElement>({ descriptor, onHandle });
  return <button {...buttonProps} {...binding.handleProps} type="button" aria-label={label} data-ui-primitive="drag-handle" style={{ ...style, cursor: binding.cursor }} />;
}

export type ControlHandleProps = Omit<InteractionHandleButtonProps<ControlHandleDescriptor>, "descriptor"> & {
  readonly descriptor?: ControlHandleDescriptor;
};

export function ControlHandle(props: ControlHandleProps) {
  const { label, descriptor = { kind: "control" }, onHandle, style, ...buttonProps } = props;
  const binding = useInteractionHandle<HTMLButtonElement>({ descriptor, onHandle });
  return <button {...buttonProps} {...binding.handleProps} type="button" aria-label={label} data-ui-primitive="control-handle" style={{ ...style, cursor: binding.cursor }} />;
}

export type ResizeHandleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "onResize"> & ControlAffordanceProps & {
  readonly label: string;
  readonly orientation: "horizontal" | "vertical";
  readonly onResize: (delta: number, phase: "preview" | "commit") => void;
  readonly onHandle?: (event: InteractionHandleEvent) => void;
  readonly descriptor?: ResizeHandleDescriptor;
  readonly className?: string;
};

export function ResizeHandle(props: ResizeHandleProps) {
  const { affordance, label, orientation, onResize, onHandle, descriptor = {
    kind: "resize",
    edge: orientation === "horizontal" ? "e" : "s",
    cursor: { idle: orientation === "horizontal" ? "col-resize" : "row-resize" },
  }, className, style, ...buttonProps } = props;
  const binding = useInteractionHandle<HTMLButtonElement>({
    descriptor,
    onHandle: (event) => {
      onHandle?.(event);
      if (event.phase !== "preview" && event.phase !== "commit") return;
      onResize(orientation === "horizontal" ? event.delta.dx : event.delta.dy, event.phase);
    },
  });
  return <button {...buttonProps} {...binding.handleProps} type="button" aria-label={label} data-ui-primitive="resize-handle" data-ui-affordance={affordance} data-ui-orientation={orientation} className={className} style={{ ...style, cursor: binding.cursor }} />;
}
