import { createJSONDocument, type JSONDocument } from "@interactive-os/json-document";
import {
  addComposerAttachments,
  composerInteractionFromKeyStroke,
  composerSchema,
  createComposerAttachments,
  createComposerDraft,
  hasComposerContent,
  insertComposerText,
  removeComposerAttachment,
  selectComposerModel,
  type ComposerDraft,
  type ComposerHostConfig,
  type ComposerHostPorts,
  type ComposerHostSuggestion,
} from "@interactive-os/json-document-composer";
import { createRichTextEditor, type RichTextEditor, type RichTextNode } from "@interactive-os/json-document-rich-text";
import type { RichTextSuggestionCandidate } from "@interactive-os/json-document-rich-text-suggestion";
import type { RichTextSuggestionBinding } from "@interactive-os/json-document-rich-text-suggestion-react";
import { fileCandidatesFromWebClipboard, fileCandidatesFromWebFiles, type WebFileCandidate, type WebFileCandidateList } from "@interactive-os/json-document-web";
import { useCallback, useRef, useState, useSyncExternalStore, type ChangeEvent, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import { ComposerReferenceAtom, type ComposerReferenceAtomProps } from "./reference-atom.js";
import { useComposerCommandMenu } from "./command-menu.js";

export interface UseComposerOptions<Model extends string, Suggestion extends ComposerHostSuggestion & RichTextSuggestionCandidate> {
  readonly id: string;
  readonly config: ComposerHostConfig<Model> & { readonly suggestions: ReadonlyArray<Suggestion> };
  readonly ports: ComposerHostPorts<Model>;
  readonly labels: {
    readonly mentionSuggestions: string;
    readonly skillSuggestions: string;
  };
}

export interface ComposerBinding<Model extends string, Suggestion extends ComposerHostSuggestion & RichTextSuggestionCandidate> {
  readonly document: JSONDocument;
  readonly draft: ComposerDraft<Model>;
  readonly editor: RichTextEditor;
  readonly editorElementRef: React.RefObject<HTMLElement | null>;
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  readonly attachments: ComposerDraft<Model>["attachments"];
  readonly model: Model;
  readonly hasContent: boolean;
  readonly commandKind: "mention" | "skill" | null;
  readonly commandMenu: RichTextSuggestionBinding<Suggestion>;
  readonly commandOpen: boolean;
  readonly editorCommandProps: Omit<RichTextSuggestionBinding<Suggestion>["referenceProps"], "onKeyDown">;
  submit(): void;
  addWebFiles(files: WebFileCandidateList | ReadonlyArray<WebFileCandidate>): void;
  handleFileInputChange(event: ChangeEvent<HTMLInputElement>): void;
  handlePaste(event: ClipboardEvent<HTMLElement>): void;
  handleKeyDown(event: KeyboardEvent<HTMLElement>): void;
  handleHistoryKeyDown(event: KeyboardEvent<HTMLElement>): void;
  openFilePicker(): void;
  removeAttachment(attachmentId: string): void;
  selectModel(model: Model): void;
  insertText(text: string): void;
  chooseTrigger(trigger: "/" | "@"): void;
  renderReference(node: RichTextNode, props?: Omit<ComposerReferenceAtomProps, "node" | "editor">): ReactNode;
}

/** Owns the reusable React and Web lifecycle that connects a Host to canonical Composer modules. */
export function useComposer<Model extends string, Suggestion extends ComposerHostSuggestion & RichTextSuggestionCandidate>(
  options: UseComposerOptions<Model, Suggestion>,
): ComposerBinding<Model, Suggestion> {
  const { config, ports } = options;
  const [document] = useState<JSONDocument>(() => createJSONDocument(createComposerDraft({
    id: ports.createId(),
    instructionId: ports.createId(),
    paragraphId: ports.createId(),
    model: config.models[0]!.value,
  })));
  const [editor] = useState(() => createRichTextEditor({ document, pointer: "/instruction", schema: composerSchema }));
  useSyncExternalStore(editor.subscribe, () => editor.snapshot.revision, () => editor.snapshot.revision);
  const draft = document.value as ComposerDraft<Model>;
  const editorElementRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commandMenu = useComposerCommandMenu({ id: options.id, editor, document: draft.instruction, suggestions: config.suggestions, createId: ports.createId, labels: options.labels });
  const content = hasComposerContent(draft);

  function submit() {
    if (content) void ports.submit(draft);
  }

  function addCandidates(candidates: ReturnType<typeof fileCandidatesFromWebFiles>) {
    if (candidates.length === 0) return;
    const created = createComposerAttachments(candidates, { createId: ports.createId, policy: config.attachments, currentCount: draft.attachments.length });
    if (!created.ok) return;
    addComposerAttachments(editor, draft, created.attachments);
    editorElementRef.current?.focus();
  }

  function addWebFiles(files: Parameters<typeof fileCandidatesFromWebFiles>[0]) {
    addCandidates(fileCandidatesFromWebFiles(files));
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    addWebFiles(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const candidates = fileCandidatesFromWebClipboard(event);
    if (candidates.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    addCandidates(candidates);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const interaction = composerInteractionFromKeyStroke({ key: event.key, shiftKey: event.shiftKey, commandKey: event.metaKey || event.ctrlKey }, config.interaction);
    if (commandMenu.open) {
      commandMenu.handleKeyDown(event);
      if (event.defaultPrevented) {
        event.stopPropagation();
        return;
      }
    }
    if (interaction !== "submit") return;
    event.preventDefault();
    event.stopPropagation();
    submit();
  }

  function handleHistoryKeyDown(event: KeyboardEvent<HTMLElement>) {
    const interaction = composerInteractionFromKeyStroke({ key: event.key, shiftKey: event.shiftKey, commandKey: event.metaKey || event.ctrlKey }, config.interaction);
    if (interaction !== "history.undo" && interaction !== "history.redo") return;
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    if (interaction === "history.redo") editor.redo();
    else editor.undo();
  }

  const renderReference = useCallback((node: RichTextNode, props: Omit<ComposerReferenceAtomProps, "node" | "editor"> = {}) => (
    <ComposerReferenceAtom {...props} node={node} editor={editor} />
  ), [editor]);

  return {
    document,
    draft,
    editor,
    editorElementRef,
    fileInputRef,
    attachments: draft.attachments,
    model: draft.model,
    hasContent: content,
    commandKind: commandMenu.kind,
    commandMenu: commandMenu.binding,
    commandOpen: commandMenu.open,
    editorCommandProps: commandMenu.editorProps,
    submit,
    addWebFiles,
    handleFileInputChange,
    handlePaste,
    handleKeyDown,
    handleHistoryKeyDown,
    openFilePicker: () => fileInputRef.current?.click(),
    removeAttachment: (attachmentId) => { removeComposerAttachment(editor, draft, attachmentId); },
    selectModel: (model) => { selectComposerModel(editor, model); },
    insertText: (text) => { insertComposerText(editor, text); },
    chooseTrigger: (value) => { editorElementRef.current?.focus(); insertComposerText(editor, value); },
    renderReference,
  };
}
