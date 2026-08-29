import {
  createElement,
  useId,
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";

export type CommandKind = "primary" | "secondary" | "danger";

type FocusPreservingControl = {
  /** Keeps focus in an editing surface during pointer activation so its DOM selection remains available. */
  readonly preserveFocus?: boolean;
};

/** Executes a command. Label-only and icon-only appearances share this semantic contract. */
export function Command(
  props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> & FocusPreservingControl & {
    readonly kind?: CommandKind;
    readonly label?: string;
    readonly rootClassName?: string;
  },
): ReactNode {
  const { "aria-label": ariaLabel, children, kind = "secondary", label, onMouseDown, preserveFocus = false, rootClassName, type = "button", ...buttonProps } = props;
  const accessibleLabel = label ?? ariaLabel;
  const tooltipId = useId();
  const command = (
    <button
      {...buttonProps}
      type={type}
      aria-describedby={label ? tooltipId : undefined}
      aria-label={accessibleLabel}
      data-ui-control="command"
      data-ui-kind={kind}
      data-ui-presentation={label ? "icon" : "label"}
      onMouseDown={preservePointerFocus(preserveFocus, onMouseDown)}
    >{children}</button>
  );
  if (!label) return command;
  return (
    <span className={rootClassName} data-ui-component="command-presentation">
      {command}
      <span id={tooltipId} role="tooltip" data-ui-tooltip="true">{label}</span>
    </span>
  );
}

/** Changes a persistent binary state. Visual forms such as a switch or chip are styling concerns. */
export function Toggle(
  props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & FocusPreservingControl & {
    readonly pressed: boolean;
    readonly presentation?: "button" | "chip";
    readonly label?: string;
    readonly tooltip?: string;
  },
): ReactNode {
  const { "aria-label": ariaLabel, children, label, onMouseDown, presentation = "button", preserveFocus = false, pressed, tooltip, type = "button", ...buttonProps } = props;
  const accessibleLabel = label ?? ariaLabel;
  const tooltipId = useId();
  const button = (
    <button
      {...buttonProps}
      type={type}
      aria-describedby={label || tooltip ? tooltipId : undefined}
      aria-label={accessibleLabel}
      aria-pressed={pressed}
      data-ui-control="toggle"
      data-ui-presentation={presentation}
      data-selected={pressed ? "true" : "false"}
      onMouseDown={preservePointerFocus(preserveFocus, onMouseDown)}
    >{children}</button>
  );
  if (!label && !tooltip) return button;
  return (
    <span data-ui-component="toggle-presentation">
      {button}
      <span id={tooltipId} role="tooltip" data-ui-tooltip="true">{tooltip ?? label}</span>
    </span>
  );
}

export type InlineChoiceOption<Id extends string = string> = {
  readonly id: Id;
  readonly label: string;
  readonly disabled?: boolean;
};

export type TabOption<T extends string | number> = {
  readonly id: T;
  readonly label: ReactNode;
  readonly disabled?: boolean;
};

export function Tabs<T extends string | number>(props: {
  readonly label: string;
  readonly value: T;
  readonly options: ReadonlyArray<TabOption<T>>;
  readonly onValueChange: (value: T) => void;
  readonly tabId: (value: T, index: number) => string;
  readonly panelId: (value: T, index: number) => string;
  readonly className?: string;
  readonly tabClassName?: string;
}): ReactNode {
  const enabled = props.options.filter((option) => !option.disabled);
  return (
    <div role="tablist" aria-label={props.label} className={props.className} data-ui-control="tabs">
      {props.options.map((option, index) => (
        <button
          key={option.id}
          id={props.tabId(option.id, index)}
          type="button"
          role="tab"
          aria-controls={props.panelId(option.id, index)}
          aria-selected={option.id === props.value}
          disabled={option.disabled}
          tabIndex={option.id === props.value ? 0 : -1}
          className={props.tabClassName}
          data-ui-tab="true"
          onClick={() => props.onValueChange(option.id)}
          onKeyDown={(event) => {
            const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
            if (direction === 0) return;
            event.preventDefault();
            const current = enabled.findIndex((item) => item.id === option.id);
            const next = enabled[(current + direction + enabled.length) % enabled.length];
            if (!next) return;
            props.onValueChange(next.id);
            event.currentTarget.parentElement
              ?.querySelectorAll<HTMLButtonElement>("[role=tab]")
              [props.options.indexOf(next)]?.focus();
          }}
        >{option.label}</button>
      ))}
    </div>
  );
}

export function InlineChoice<Id extends string>(props: {
  readonly label: string;
  readonly value: Id;
  readonly options: ReadonlyArray<InlineChoiceOption<Id>>;
  readonly onValueChange: (value: Id) => void;
  readonly className?: string;
}): ReactNode {
  const enabled = props.options.filter((option) => !option.disabled);
  const move = (from: Id, direction: 1 | -1) => {
    const index = enabled.findIndex((option) => option.id === from);
    const next = enabled[(index + direction + enabled.length) % enabled.length];
    if (next) props.onValueChange(next.id);
  };
  return (
    <div role="radiogroup" aria-label={props.label} className={props.className} data-ui-control="choice" data-ui-presentation="inline">
      {props.options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={option.id === props.value}
          disabled={option.disabled}
          tabIndex={option.id === props.value ? 0 : -1}
          data-ui-segment="true"
          onClick={() => props.onValueChange(option.id)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowDown" && event.key !== "ArrowLeft" && event.key !== "ArrowUp") return;
            event.preventDefault();
            const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
            move(option.id, direction);
            const index = enabled.findIndex((item) => item.id === option.id);
            const next = enabled[(index + direction + enabled.length) % enabled.length];
            event.currentTarget.parentElement
              ?.querySelectorAll<HTMLButtonElement>("[role=radio]")
              [props.options.indexOf(next!)]?.focus();
          }}
        >{option.label}</button>
      ))}
    </div>
  );
}

export type SelectableItemProps<T extends ElementType = "button"> = {
  readonly as?: T;
  readonly selected: boolean;
  readonly focus?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "data-selected" | "data-focus">;

export function SelectableItem<T extends ElementType = "button">(
  props: SelectableItemProps<T>,
): ReactNode {
  const { as, selected, focus = false, ...itemProps } = props;
  const Component = as ?? "button";
  return createElement(Component, {
    ...itemProps,
    "data-selected": selected ? "true" : "false",
    "data-focus": focus ? "true" : "false",
    "data-ui-control": "selectable",
  });
}

export function DisclosureButton(
  props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-expanded" | "aria-controls"> & {
    readonly expanded: boolean;
    readonly controls: string;
  },
): ReactNode {
  const { expanded, controls, type = "button", ...buttonProps } = props;
  return (
    <button
      {...buttonProps}
      type={type}
      aria-expanded={expanded}
      aria-controls={controls}
      data-ui-control="disclosure"
    />
  );
}

function preservePointerFocus(
  preserveFocus: boolean,
  onMouseDown: ButtonHTMLAttributes<HTMLButtonElement>["onMouseDown"],
) {
  if (!preserveFocus) return onMouseDown;
  return (event: Parameters<NonNullable<typeof onMouseDown>>[0]) => {
    onMouseDown?.(event);
    event.preventDefault();
  };
}
