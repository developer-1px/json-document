import {
  createContentEditableAdapter,
  type ContentEditableAdapter,
  type TextSurfaceResolver,
} from "@interactive-os/json-document-contenteditable-web";
import type { JSONDocument, SelectionSnap } from "@interactive-os/json-document";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";

export interface ContentEditableCommandPointerEvent {
  preventDefault(): void;
}

export interface UseContentEditableOptions<T> {
  document: JSONDocument<T>;
  rootRef: RefObject<HTMLElement | null>;
  surface: TextSurfaceResolver;
  renderContent(root: HTMLElement, value: T): void;
  atomAttribute?: string;
  textAttribute?: string;
  clipboardMime?: string;
}

export interface UseContentEditableResult<T> {
  adapterRef: RefObject<ContentEditableAdapter<T> | null>;
  commandSelectionRef: RefObject<SelectionSnap | null>;
  renderNow(): void;
  restoreSelectionToDOM(selection?: SelectionSnap): boolean;
  syncCommandSelection(event?: ContentEditableCommandPointerEvent): SelectionSnap | null;
  getCommandSelection(): SelectionSnap | null;
}

export function useContentEditable<T>({
  atomAttribute,
  clipboardMime,
  document,
  renderContent,
  rootRef,
  surface,
  textAttribute,
}: UseContentEditableOptions<T>): UseContentEditableResult<T> {
  const adapterRef = useRef<ContentEditableAdapter<T> | null>(null);
  const commandSelectionRef = useRef<SelectionSnap | null>(null);

  const renderNow = useCallback(() => {
    const root = rootRef.current;
    if (root === null) return;
    renderContent(root, document.value);
    adapterRef.current?.restoreSelectionToDOM();
  }, [document, renderContent, rootRef]);

  const restoreSelectionToDOM = useCallback((selection?: SelectionSnap): boolean => {
    return adapterRef.current?.restoreSelectionToDOM(selection) ?? false;
  }, []);

  const syncCommandSelection = useCallback(
    (event?: ContentEditableCommandPointerEvent): SelectionSnap | null => {
      event?.preventDefault();
      const selection =
        adapterRef.current?.syncSelectionFromDOM() ??
        document.selection?.snapshot() ??
        null;
      commandSelectionRef.current = selection;
      return selection;
    },
    [document],
  );

  const getCommandSelection = useCallback(
    (): SelectionSnap | null => commandSelectionRef.current,
    [],
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root === null) return undefined;

    renderContent(root, document.value);
    const adapter = createContentEditableAdapter({
      document,
      root,
      surface,
      ...(atomAttribute === undefined ? {} : { atomAttribute }),
      ...(clipboardMime === undefined ? {} : { clipboardMime }),
      ...(textAttribute === undefined ? {} : { textAttribute }),
    });
    adapterRef.current = adapter;
    const unbind = adapter.bind();
    adapter.restoreSelectionToDOM();

    const unsubscribe = document.subscribe(() => {
      renderContent(root, document.value);
      adapter.restoreSelectionToDOM();
    });

    return () => {
      unsubscribe();
      unbind();
      if (adapterRef.current === adapter) adapterRef.current = null;
    };
  }, [
    atomAttribute,
    clipboardMime,
    document,
    renderContent,
    rootRef,
    surface,
    textAttribute,
  ]);

  return {
    adapterRef,
    commandSelectionRef,
    renderNow,
    restoreSelectionToDOM,
    syncCommandSelection,
    getCommandSelection,
  };
}
