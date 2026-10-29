import {useState, type ReactNode} from "react";
import {Field} from "./input-controls.js";
import {Command} from "./controls.js";
import {InlineAlert} from "./workflow-feedback.js";
/** Draft is local; only explicit submit reaches the host command. Failed submissions retain text. */
export function CommentComposer({label, onSubmit, submitLabel = "메모 남기기", identity = "default", disabled=false}: {readonly label: string; readonly onSubmit: (text: string) => Promise<void> | void; readonly submitLabel?: string; readonly identity?: string; readonly disabled?:boolean}): ReactNode {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draft = drafts[identity] ?? "";
  const setDraft = (value: string) => setDrafts(previous => ({...previous, [identity]: value}));
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const error = errors[identity] ?? false;
  const setError = (value: boolean) => setErrors(previous => ({...previous, [identity]: value}));
  return <form aria-label={label} data-ui-component="comment-composer" onSubmit={async event => {
    event.preventDefault(); if (disabled || pending || !draft.trim()) return;
    setPending(true); setError(false);
    try {await onSubmit(draft.trim()); setDraft("");} catch {setError(true);} finally {setPending(false);}
  }}><Field label={label} placeholder={label} multiline value={draft} onValueChange={setDraft} disabled={disabled || pending} />{error && <InlineAlert tone="error" title="메모를 저장하지 못했습니다.">내용을 유지했습니다. 다시 시도해 주세요.</InlineAlert>}<Command kind="primary" type="submit" disabled={disabled || pending || !draft.trim()} aria-busy={pending}>{pending ? "저장 중…" : submitLabel}</Command></form>;
}
