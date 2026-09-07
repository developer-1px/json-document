import { createElement, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
import {
  applyAffordance,
  caretAffordance,
  caretCursor,
  clickCountAffordance,
} from "@interactive-os/json-document-affordance";
import { textInputFromControl, textSelectionFromControl, type WebTextInput } from "@interactive-os/json-document-web";
import { restoreTextCursor } from "./use-editing.js";

export interface UseDocumentTextControlOptions {
  readonly text: string;
  readonly offset: number | null;
  readonly onCaretRange: (from: number, to: number, mode: "replace" | "extend") => void;
  readonly onTextInput: (input: WebTextInput) => void;
  readonly onClickCount?: (count: number) => void;
}

export interface DocumentTextControlBinding {
  readonly ref: { readonly current: HTMLTextAreaElement | null };
  readonly props: Pick<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onFocus" | "onClick" | "onSelect" | "onChange" | "style"
  >;
}

export interface DocumentTextControlProps extends UseDocumentTextControlOptions, Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onFocus" | "onClick" | "onSelect" | "onChange"
> {}

/** Composes the official Web input and caret affordances into a React textarea lifecycle. */
export function useDocumentTextControl(options: UseDocumentTextControlOptions): DocumentTextControlBinding {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const control = ref.current;
    if (control === null || options.offset === null) return;
    // Native selection already owns the range when its focus matches the model.
    // Echoing that focus as a collapsed cursor would emit another select event.
    if (textSelectionFromControl({ currentTarget: control }).focus !== options.offset) {
      restoreTextCursor(control, options.offset);
    }
  }, [options.offset]);

  return {
    ref,
    props: {
      value: options.text,
      onFocus(event) {
        const { anchor, focus } = textSelectionFromControl(event);
        options.onCaretRange(anchor, focus, "replace");
      },
      onClick(event) {
        applyAffordance(caretAffordance({ type: "pointer" }), {
          hand(hand) {
            if (hand.type === "caret") {
              const { anchor, focus } = textSelectionFromControl(event);
              options.onCaretRange(anchor, focus, hand.operation);
            }
          },
        });
        applyAffordance(clickCountAffordance(event.detail), {
          hand(hand) {
            if (hand.type === "click") options.onClickCount?.(hand.count);
          },
        });
      },
      onSelect(event) {
        applyAffordance(caretAffordance({ type: "pointer", dragging: true }), {
          hand(hand) {
            if (hand.type === "caret") {
              const { anchor, focus } = textSelectionFromControl(event);
              options.onCaretRange(anchor, focus, hand.operation);
            }
          },
        });
      },
      onChange(event) {
        options.onTextInput(textInputFromControl(event));
      },
      style: { cursor: caretCursor("horizontal") },
    },
  };
}

/** Renders the standard Document textarea while the host owns layout and product Intent. */
export function DocumentTextControl({
  text,
  offset,
  onCaretRange,
  onTextInput,
  onClickCount,
  style,
  ...textareaProps
}: DocumentTextControlProps) {
  const binding = useDocumentTextControl({
    text,
    offset,
    onCaretRange,
    onTextInput,
    ...(onClickCount === undefined ? {} : { onClickCount }),
  });
  return createElement("textarea", {
    ...textareaProps,
    ...binding.props,
    ref: binding.ref,
    style: { ...binding.props.style, ...style },
  });
}
