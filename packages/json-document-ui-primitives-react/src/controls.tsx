import {
  createElement,
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";

export function ActionButton(props: ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Keeps focus in an editing surface during pointer activation so its DOM selection remains available. */
  readonly preserveFocus?: boolean;
}): ReactNode {
  const { onMouseDown, preserveFocus = false, type = "button", ...buttonProps } = props;
  return <button
    {...buttonProps}
    type={type}
    data-ui-control="action"
    onMouseDown={preserveFocus ? (event) => {
      onMouseDown?.(event);
      event.preventDefault();
    } : onMouseDown}
  />;
}

export function ToggleButton(
  props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & {
    readonly pressed: boolean;
  },
): ReactNode {
  const { pressed, type = "button", ...buttonProps } = props;
  return <button {...buttonProps} type={type} aria-pressed={pressed} data-ui-control="toggle" />;
}

export function IconButton(
  props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> & {
    readonly label: string;
  },
): ReactNode {
  const { label, type = "button", ...buttonProps } = props;
  return (
    <button
      {...buttonProps}
      type={type}
      aria-label={label}
      title={label}
      data-ui-control="icon"
    />
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
