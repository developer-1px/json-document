import { useEffect, useState, type ReactNode } from "react";
import {FieldPresentation} from "./field-presentation.js";
import { Command } from "./controls.js";
import { Field } from "./input-controls.js";
import { contentPresentation } from "./content-presentation.js";

/** Reading is the default; a draft belongs to one record identity and commits only on save. */
export function EditableText({label, value, identity, disabled = false, onCommit}: {
  readonly label: string; readonly value: string; readonly identity?: string;
  readonly disabled?: boolean; readonly onCommit: (value: string) => boolean | void;
}): ReactNode {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => {setDraft(value); setEditing(false);}, [identity, value]);
  const close = () => {setDraft(value); setEditing(false);};
  return <section className={contentPresentation.group} data-ui-component="editable-text" aria-label={label}>
    <FieldPresentation label={label} heading={<h2 className={contentPresentation.heading}>{label}</h2>} disabled={disabled} mode={editing ? "edit" : "read"} onEditRequest={() => setEditing(true)} read={<p className={value ? contentPresentation.body : contentPresentation.caption}>{value || "내용이 없습니다."}</p>} edit={
    <form className={contentPresentation.group} onSubmit={event => {event.preventDefault(); if (onCommit(draft) !== false) close();}} onKeyDown={event => {if (event.key === "Escape") {event.preventDefault(); close();}}}>
      <Field multiline rows={10} label={label} value={draft} disabled={disabled} onValueChange={setDraft} />
      <div data-editable-text-actions><Command kind="primary" type="submit" disabled={disabled || draft === value}>저장</Command><Command onClick={close}>취소</Command></div>
    </form>}/>
  </section>;
}
