import type { FocusEvent } from "react";
import type { DatabaseProperty, DatabaseRecord } from "@interactive-os/json-document-editing";
import { classes, ui } from "../../shared/ui/styles";

export type DatabaseNativeTextLease = {
  readonly recordId: string;
  readonly propertyId: string;
  readonly composing: boolean;
};

export interface DatabasePropertyEditorProps {
  readonly property: DatabaseProperty;
  readonly record: DatabaseRecord;
  readonly onCommit: (value: string | number | boolean) => void;
  readonly onLease: (lease: DatabaseNativeTextLease | null) => void;
}

/** Page-local Database cell editor; visual policy and native text lease stay with the Demo Host. */
export function DatabasePropertyEditor(props: DatabasePropertyEditorProps) {
  const value = props.record.values[props.property.id]!;
  if (props.property.type === "checkbox") {
    return (
      <label className="flex items-center justify-center px-3 py-2">
        <input
          type="checkbox"
          aria-label={`${props.property.name} ${props.record.id}`}
          checked={Boolean(value)}
          onChange={(event) => props.onCommit(event.currentTarget.checked)}
          className={ui.database.checkbox}
        />
      </label>
    );
  }
  if (props.property.type === "select") {
    return (
      <div className="px-2 py-1.5">
        <select
          aria-label={`${props.property.name} ${props.record.id}`}
          value={String(value)}
          onChange={(event) => props.onCommit(event.currentTarget.value)}
          className={classes("w-full", ui.database.select)}
        >
          {props.property.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </div>
    );
  }
  const isText = props.property.type === "title" || props.property.type === "text";
  return (
    <input
      key={String(value)}
      type={props.property.type === "number" ? "number" : "text"}
      aria-label={`${props.property.name} ${props.record.id}`}
      defaultValue={String(value)}
      onFocus={() => isText && props.onLease({ recordId: props.record.id, propertyId: props.property.id, composing: false })}
      onCompositionStart={() => isText && props.onLease({ recordId: props.record.id, propertyId: props.property.id, composing: true })}
      onCompositionEnd={() => isText && props.onLease({ recordId: props.record.id, propertyId: props.property.id, composing: false })}
      onBlur={(event) => {
        commitInput(event, props.property, props.onCommit);
        if (isText) props.onLease(null);
      }}
      className={classes("w-full min-w-0", ui.field.seamless)}
    />
  );
}

function commitInput(
  event: FocusEvent<HTMLInputElement>,
  property: DatabaseProperty,
  commit: (value: string | number) => void,
) {
  commit(property.type === "number" ? Number(event.currentTarget.value) : event.currentTarget.value);
}
