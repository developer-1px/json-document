import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createLineFocusSession, createTypeaheadSession } from "@interactive-os/json-document-affordance";

export type SelectOption = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
};

export type SelectClassNames = {
  readonly root?: string;
  readonly trigger?: string;
  readonly listbox?: string;
  readonly option?: string;
  readonly focusedOption?: string;
  readonly selectedOption?: string;
};

export function Select(props: {
  readonly id?: string;
  readonly label: string;
  readonly value: string;
  readonly options: ReadonlyArray<SelectOption>;
  readonly onValueChange: (value: string) => void;
  readonly renderValue?: (option: SelectOption) => ReactNode;
  readonly renderOption?: (option: SelectOption) => ReactNode;
  readonly classNames?: SelectClassNames;
  readonly disabled?: boolean;
}) {
  const generatedId = useId();
  const listboxId = props.id ?? `json-document-select-${generatedId.replaceAll(":", "")}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [focusId, setFocusId] = useState(props.value);
  const [focusSession] = useState(() => createLineFocusSession<string>({
    initialKey: props.value,
    wrap: true,
    onFocus: (key) => { if (key !== null) setFocusId(key); },
  }));
  const [typeaheadSession] = useState(() => createTypeaheadSession<string>({
    onMatch: (key) => focusSession.setFocus(key),
  }));
  const selected = props.options.find((option) => option.id === props.value) ?? props.options[0];
  const enabled = props.options.filter((option) => !option.disabled);

  useEffect(() => {
    if (open) listboxRef.current?.focus();
  }, [open]);

  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus());
  }

  function openListbox() {
    if (props.disabled || enabled.length === 0) return;
    focusSession.setFocus(enabled.some((option) => option.id === props.value) ? props.value : enabled[0]!.id);
    setOpen(true);
  }

  function move(delta: -1 | 1) {
    focusSession.handle({ key: delta === 1 ? "ArrowDown" : "ArrowUp", shiftKey: false }, enabled.map((option) => option.id));
  }

  function commit(id = focusId) {
    const option = enabled.find((candidate) => candidate.id === id);
    if (!option) return;
    props.onValueChange(option.id);
    close();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusSession.handle(event, enabled.map((option) => option.id));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      commit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      close(false);
      return;
    }
    if (typeaheadSession.handle({
      key: event.key,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      timeStamp: event.timeStamp,
      items: enabled.map((option) => ({ key: option.id, name: option.label })),
      fromKey: focusSession.getFocusKey(),
    })) event.preventDefault();
  }

  return (
    <div className={props.classNames?.root} data-ui-primitive="select">
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
          id={listboxId}
          role="listbox"
          aria-label={props.label}
          aria-activedescendant={optionId(listboxId, focusId)}
          tabIndex={-1}
          className={props.classNames?.listbox}
          onKeyDown={handleKeyDown}
        >
          {props.options.map((option) => {
            const focused = option.id === focusId;
            const isSelected = option.id === props.value;
            return (
              <button
                key={option.id}
                id={optionId(listboxId, option.id)}
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                disabled={option.disabled}
                data-focus={focused || undefined}
                data-selected={isSelected || undefined}
                className={classes(
                  props.classNames?.option,
                  focused && props.classNames?.focusedOption,
                  isSelected && props.classNames?.selectedOption,
                )}
                style={unstyledButton}
                onPointerMove={() => { if (!option.disabled) focusSession.setFocus(option.id); }}
                onClick={() => commit(option.id)}
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

function optionId(listboxId: string, value: string): string {
  return `${listboxId}-option-${encodeURIComponent(value)}`;
}

function classes(...values: ReadonlyArray<string | false | undefined>): string | undefined {
  const value = values.filter(Boolean).join(" ");
  return value || undefined;
}
