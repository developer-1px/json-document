import type {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
  Ref,
  TextareaHTMLAttributes,
} from "react";
import { Minus, Plus, Search as SearchIcon } from "lucide-react";
import { Command } from "./controls.js";

export function Check(props: {
  readonly label: string;
  readonly checked: boolean;
  readonly indeterminate?: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly disabled?: boolean | undefined;
  readonly className?: string;
}): ReactNode {
  return (
    <input
      type="checkbox"
      aria-label={props.label}
      checked={props.checked}
      ref={element => {if (element) element.indeterminate = props.indeterminate ?? false;}}
      aria-checked={props.indeterminate ? "mixed" : props.checked}
      disabled={props.disabled}
      className={props.className}
      data-ui-control="check"
      onChange={(event) => props.onCheckedChange(event.currentTarget.checked)}
    />
  );
}

type FieldBaseProps = {
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly presentation?: "standard" | "seamless";
  readonly disabled?: boolean | undefined;
  readonly placeholder?: string;
  readonly className?: string;
};

type FieldProps = FieldBaseProps & (
  | ({
    readonly multiline?: false;
    readonly controlRef?: Ref<HTMLInputElement>;
  } & Omit<InputHTMLAttributes<HTMLInputElement>, "aria-label" | "className" | "disabled" | "onChange" | "placeholder" | "ref" | "type" | "value">)
  | ({
    readonly multiline: true;
    readonly controlRef?: Ref<HTMLTextAreaElement>;
  } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "aria-label" | "className" | "disabled" | "onChange" | "placeholder" | "ref" | "value">)
);

export function Field(props: FieldProps): ReactNode {
  const {
    label,
    value,
    onValueChange,
    multiline,
    presentation = "standard",
    controlRef,
    disabled,
    placeholder,
    className,
    ...controlProps
  } = props;
  const common = {
    "aria-label": label,
    value,
    disabled,
    placeholder,
    className,
    "data-ui-control": "field",
    "data-ui-presentation": presentation,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onValueChange(event.currentTarget.value),
  } as const;
  if (multiline) {
    return <textarea {...controlProps as TextareaHTMLAttributes<HTMLTextAreaElement>} {...common} ref={controlRef as Ref<HTMLTextAreaElement>} />;
  }
  return <input {...controlProps as InputHTMLAttributes<HTMLInputElement>} {...common} ref={controlRef as Ref<HTMLInputElement>} type="text" />;
}

export function Search(props: {
  readonly inputProps?: Pick<InputHTMLAttributes<HTMLInputElement>, "onKeyDown" | "aria-controls" | "aria-activedescendant" | "disabled">;
  readonly label: string;
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly results?: ReactNode;
  readonly placeholder?: string;
  readonly className?: string;
  readonly inputClassName?: string;
}): ReactNode {
  return (
    <search className={props.className} data-ui-control="search">
      <SearchIcon aria-hidden="true" size={16} data-ui-search-icon />
      <input
        {...props.inputProps}
        type="search"
        aria-label={props.label}
        placeholder={props.placeholder ?? props.label}
        value={props.query}
        className={props.inputClassName}
        onChange={(event) => props.onQueryChange(event.currentTarget.value)}
      />
      {props.results}
    </search>
  );
}

export function ValueInput(props: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly onValueChange: (value: number) => void;
  readonly presentation: "continuous" | "stepped";
  readonly disabled?: boolean;
  readonly className?: string;
}): ReactNode {
  const step = props.step ?? 1;
  const commit = (value: number) => props.onValueChange(Math.min(props.max, Math.max(props.min, value)));
  if (props.presentation === "continuous") {
    return (
      <input
        type="range"
        aria-label={props.label}
        min={props.min}
        max={props.max}
        step={step}
        value={props.value}
        disabled={props.disabled}
        className={props.className}
        data-ui-control="value"
        data-ui-presentation="continuous"
        onChange={(event) => commit(event.currentTarget.valueAsNumber)}
      />
    );
  }
  return (
    <div role="group" aria-label={props.label} className={props.className} data-ui-control="value" data-ui-presentation="stepped">
      <Command label={`Decrease ${props.label}`} disabled={props.disabled || props.value <= props.min} onClick={() => commit(props.value - step)}><Minus aria-hidden="true" size={16} /></Command>
      <output aria-live="polite">{props.value}</output>
      <Command label={`Increase ${props.label}`} disabled={props.disabled || props.value >= props.max} onClick={() => commit(props.value + step)}><Plus aria-hidden="true" size={16} /></Command>
    </div>
  );
}

/** Native form-library inputs share Field presentation without replacing their binding contract. */
export const fieldPresentation = { standard: "json-document-field", checkbox: "json-document-check", seamless: "json-document-field json-document-field-seamless" } as const;
