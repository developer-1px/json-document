import { useId, type ReactNode } from "react";
import { ArrowUp } from "lucide-react";
import type { ComposerHostSuggestion } from "@interactive-os/json-document-composer";
import type { RichTextSuggestionCandidate } from "@interactive-os/json-document-rich-text-suggestion";
import { RichTextEditorSurface } from "@interactive-os/json-document-rich-text-react";
import { Command } from "@interactive-os/json-document-ui-primitives-react";
import type { ComposerBinding } from "./use-composer.js";

/** Compact text Composer. Configure an empty suggestion catalog; attachment UI is outside this surface. */
export interface ChatComposerProps<Model extends string, Suggestion extends ComposerHostSuggestion & RichTextSuggestionCandidate> {
  readonly composer: ComposerBinding<Model, Suggestion>;
  readonly label: string;
  readonly submitLabel: string;
  readonly submitErrorLabel: string;
  readonly placeholder?: string;
  readonly className?: string;
}

export function ChatComposer<Model extends string, Suggestion extends ComposerHostSuggestion & RichTextSuggestionCandidate>({
  composer, label, submitLabel, submitErrorLabel, placeholder, className,
}: ChatComposerProps<Model, Suggestion>): ReactNode {
  const errorId = useId();
  return (
    <form className={className} data-ui-chat-composer="" aria-label={label}
      onSubmit={(event) => { event.preventDefault(); composer.submit(); }}
      onKeyDownCapture={composer.handleHistoryKeyDown}>
      <div data-ui-chat-composer-row="">
        <RichTextEditorSurface
          as="div"
          editor={composer.editor}
          elementRef={composer.editorElementRef}
          role="textbox"
          aria-label={label}
          aria-multiline="true"
          aria-describedby={composer.submitError === null ? undefined : errorId}
          {...(placeholder === undefined ? {} : { placeholder })}
          onKeyDownCapture={composer.handleKeyDown}
          renderExtension={(node) => composer.renderReference(node)}
          data-ui-chat-composer-input=""
        />
        <Command type="submit" preserveFocus aria-label={submitLabel} disabled={!composer.canSubmit}
          aria-busy={composer.isSubmitting} data-ui-chat-composer-send="">
          <ArrowUp aria-hidden="true" size={18} />
        </Command>
      </div>
      {composer.submitError === null ? null : <p id={errorId} role="alert" data-ui-chat-composer-error="">{submitErrorLabel}</p>}
    </form>
  );
}
