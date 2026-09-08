import { useCallback, useEffect, useRef, useState, type RefCallback } from "react";
import {
  registerWebVirtualSelectionScope,
  type WebVirtualSelectionScopeActivation,
} from "@interactive-os/json-document-web";

export interface UseVirtualSelectionScopeOptions {
  readonly activation: WebVirtualSelectionScopeActivation;
  readonly boundaryRef?: { readonly current: HTMLElement | null };
  readonly readAllText: () => string;
}

/** Composes a Web virtual selection scope registration with a React callback ref. */
export function useVirtualSelectionScope<Element extends HTMLElement = HTMLElement>(
  options: UseVirtualSelectionScopeOptions,
): RefCallback<Element> {
  const [element, setElement] = useState<Element | null>(null);
  const readAllTextRef = useRef(options.readAllText);
  readAllTextRef.current = options.readAllText;

  useEffect(() => {
    if (element === null) return;
    const registration = registerWebVirtualSelectionScope(element.ownerDocument, {
      activation: options.activation,
      boundaryRef: options.boundaryRef ?? { current: element },
      readAllText: () => readAllTextRef.current(),
      selectionRef: { current: element },
    });
    return () => registration.unregister();
  }, [element, options.activation, options.boundaryRef]);

  return useCallback((next: Element | null) => setElement(next), []);
}
