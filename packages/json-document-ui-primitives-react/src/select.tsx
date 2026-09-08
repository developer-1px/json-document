import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useListbox } from "./listbox.js";
import type { ControlAffordanceProps } from "./control-affordance.js";

export type PopupChoiceOption<Id extends string = string> = {
  readonly id: Id;
  readonly label: string;
  readonly disabled?: boolean;
};

export type PopupChoiceClassNames = {
  readonly root?: string;
  readonly trigger?: string;
  readonly listbox?: string;
  readonly option?: string;
  readonly focusedOption?: string;
  readonly selectedOption?: string;
};

export function PopupChoice<Id extends string>(props: {
  readonly id?: string;
  readonly label: string;
  readonly value: Id;
  readonly options: ReadonlyArray<PopupChoiceOption<Id>>;
  readonly onValueChange: (value: Id) => void;
  readonly renderValue?: (option: PopupChoiceOption<Id>) => ReactNode;
  readonly renderOption?: (option: PopupChoiceOption<Id>) => ReactNode;
  readonly classNames?: PopupChoiceClassNames;
  readonly disabled?: boolean;
} & ControlAffordanceProps) {
  const generatedId = useId();
  const listboxId = props.id ?? `json-document-select-${generatedId.replaceAll(":", "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [focusId, setFocusId] = useState(props.value);
  const selected = props.options.find((option) => option.id === props.value) ?? props.options[0];
  const enabled = props.options.filter((option) => !option.disabled);
  const listbox = useListbox({
    id: listboxId,
    label: props.label,
    items: props.options.map((option) => ({ ...option, textValue: option.label })),
    activeId: focusId,
    selectedId: props.value,
    wrap: true,
    onActiveChange: (id) => { if (id !== null) setFocusId(id); },
    onAction: (id) => {
      const option = enabled.find((candidate) => candidate.id === id);
      if (!option) return;
      props.onValueChange(option.id);
      close();
    },
  });

  useEffect(() => {
    if (open) listboxRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) close(false);
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    return () => document.removeEventListener("pointerdown", dismissOutside, true);
  }, [open]);

  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus());
  }

  function openListbox() {
    if (props.disabled || enabled.length === 0) return;
    setFocusId(enabled.some((option) => option.id === props.value) ? props.value : enabled[0]!.id);
    setOpen(true);
  }

  return (
    <div ref={rootRef} className={props.classNames?.root} data-ui-control="choice" data-ui-presentation="popup" data-ui-affordance={props.affordance}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={props.label}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        disabled={props.disabled}
        className={props.classNames?.trigger}
        style={unstyledButton}
        onClick={() => open ? close(false) : openListbox()}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            openListbox();
          }
        }}
      >
        {selected ? props.renderValue?.(selected) ?? selected.label : null}
      </button>
      {open ? (
        <div
          ref={listboxRef}
          {...listbox.listboxProps}
          tabIndex={-1}
          className={props.classNames?.listbox}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
              return;
            }
            if (event.key === "Tab") {
              close(false);
              return;
            }
            listbox.listboxProps.onKeyDown?.(event);
          }}
        >
          {props.options.map((option) => {
            const focused = option.id === focusId;
            const isSelected = option.id === props.value;
            return (
              <button
                key={option.id}
                {...listbox.optionProps({ ...option, textValue: option.label })}
                className={classes(
                  props.classNames?.option,
                  focused && props.classNames?.focusedOption,
                  isSelected && props.classNames?.selectedOption,
                )}
                style={unstyledButton}
              >
                {props.renderOption?.(option) ?? option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const unstyledButton: CSSProperties = { cursor: "pointer" };

function classes(...values: ReadonlyArray<string | false | undefined>): string | undefined {
  const value = values.filter(Boolean).join(" ");
  return value || undefined;
}
