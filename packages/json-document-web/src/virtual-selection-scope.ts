export type WebVirtualSelectionScopeActivation = "contained" | "fallback";

export interface WebVirtualSelectionScopeElementRef {
  readonly current: object | null;
}

export interface WebVirtualSelectionScopeOptions {
  readonly activation: WebVirtualSelectionScopeActivation;
  readonly boundaryRef?: WebVirtualSelectionScopeElementRef;
  readonly readAllText: () => string;
  readonly selectionRef: WebVirtualSelectionScopeElementRef;
}

export interface WebVirtualSelectionScopeRegistration {
  unregister(): void;
}

interface RegisteredScope {
  readonly activation: WebVirtualSelectionScopeActivation;
  readonly boundaryRef?: { readonly current: HTMLElement | null };
  readonly readAllText: () => string;
  readonly selectionRef: { readonly current: HTMLElement | null };
}

const coordinators = new WeakMap<Document, WebVirtualSelectionCoordinator>();

/** Registers a model-backed text scope in the owner document's native selection lifecycle. */
export function registerWebVirtualSelectionScope(
  document: object,
  options: WebVirtualSelectionScopeOptions,
): WebVirtualSelectionScopeRegistration {
  const ownerDocument = document as Document;
  const coordinator = coordinators.get(ownerDocument) ?? createCoordinator(ownerDocument);
  return coordinator.register({
    activation: options.activation,
    readAllText: options.readAllText,
    selectionRef: options.selectionRef as { readonly current: HTMLElement | null },
    ...(options.boundaryRef === undefined
      ? {}
      : { boundaryRef: options.boundaryRef as { readonly current: HTMLElement | null } }),
  });
}

function createCoordinator(document: Document): WebVirtualSelectionCoordinator {
  let coordinator: WebVirtualSelectionCoordinator;
  coordinator = new WebVirtualSelectionCoordinator(document, () => coordinators.delete(document));
  coordinators.set(document, coordinator);
  return coordinator;
}

class WebVirtualSelectionCoordinator {
  private activeScope: RegisteredScope | null = null;
  private disposed = false;
  private pointerScope: RegisteredScope | null = null;
  private pointerTargetEditable = false;
  private readonly scopes = new Set<RegisteredScope>();

  constructor(
    private readonly document: Document,
    private readonly onEmpty: () => void,
  ) {
    document.addEventListener("copy", this.handleCopy);
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("pointerdown", this.handlePointerDown, true);
    document.addEventListener("selectionchange", this.handleSelectionChange);
  }

  register(scope: RegisteredScope): WebVirtualSelectionScopeRegistration {
    if (
      scope.activation === "fallback"
      && [...this.scopes].some((candidate) => candidate.activation === "fallback")
    ) {
      throw new Error("A document can register only one fallback virtual selection scope.");
    }
    this.scopes.add(scope);
    let registered = true;
    return {
      unregister: () => {
        if (!registered) return;
        registered = false;
        this.scopes.delete(scope);
        if (this.activeScope === scope) this.activeScope = null;
        if (this.pointerScope === scope) this.pointerScope = null;
        if (this.scopes.size === 0) this.dispose();
      },
    };
  }

  private readonly handleCopy = (event: ClipboardEvent) => {
    const scope = this.activeScope;
    if (scope === null) return;
    const text = scope.readAllText();
    if (text.length === 0 || event.clipboardData === null) return;
    event.clipboardData.setData("text/plain", text);
    event.preventDefault();
  };

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return;
    if (isPlatformShortcut(event, "a")) {
      const scope = this.resolveKeyboardScope(event.target);
      const selectionRoot = scope?.selectionRef.current;
      if (scope === undefined || selectionRoot === null || selectionRoot === undefined) return;
      event.preventDefault();
      this.activeScope = scope;
      selectContents(selectionRoot);
      return;
    }
    if (this.activeScope !== null && event.key === "Escape") {
      event.preventDefault();
      selectionFor(this.document)?.removeAllRanges();
      this.activeScope = null;
    }
  };

  private readonly handlePointerDown = (event: PointerEvent) => {
    this.pointerTargetEditable = isEditableTarget(event.target);
    this.pointerScope = this.resolveScope(event.target) ?? null;
  };

  private readonly handleSelectionChange = () => {
    const selectionRoot = this.activeScope?.selectionRef.current;
    if (selectionRoot === null || selectionRoot === undefined || !selectionCovers(selectionRoot)) {
      this.activeScope = null;
    }
  };

  private resolveScope(target: EventTarget | null): RegisteredScope | undefined {
    const contained = [...this.scopes]
      .filter((scope) => scope.activation === "contained")
      .map((scope) => ({ distance: boundaryDistance(target, scope.boundaryRef?.current ?? scope.selectionRef.current), scope }))
      .filter((candidate): candidate is { readonly distance: number; readonly scope: RegisteredScope } => candidate.distance !== null)
      .sort((left, right) => left.distance - right.distance)
      .at(0)?.scope;
    return contained ?? [...this.scopes].find((scope) => scope.activation === "fallback");
  }

  private resolveKeyboardScope(target: EventTarget | null): RegisteredScope | undefined {
    const targetScope = this.resolveScope(target);
    if (this.pointerTargetEditable) return targetScope;
    if (isDocumentLevelTarget(target)) return this.pointerScope ?? targetScope;
    return targetScope;
  }

  private dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.document.removeEventListener("copy", this.handleCopy);
    this.document.removeEventListener("keydown", this.handleKeyDown);
    this.document.removeEventListener("pointerdown", this.handlePointerDown, true);
    this.document.removeEventListener("selectionchange", this.handleSelectionChange);
    this.scopes.clear();
    this.activeScope = null;
    this.pointerScope = null;
    this.onEmpty();
  }
}

function boundaryDistance(target: EventTarget | null, boundary: HTMLElement | null | undefined): number | null {
  if (boundary === null || boundary === undefined || !isNode(target)) return null;
  let distance = 0;
  let node: Node | null = target;
  while (node !== null && node !== boundary) {
    node = node.parentNode;
    distance += 1;
  }
  return node === boundary ? distance : null;
}

function selectContents(root: HTMLElement) {
  const selection = selectionFor(root.ownerDocument);
  if (selection === null) return;
  const range = root.ownerDocument.createRange();
  range.selectNodeContents(root);
  selection.removeAllRanges();
  selection.addRange(range);
}

function selectionCovers(root: HTMLElement): boolean {
  const selection = selectionFor(root.ownerDocument);
  if (selection === null || selection.rangeCount !== 1) return false;
  const selectedRange = selection.getRangeAt(0);
  const rootRange = root.ownerDocument.createRange();
  rootRange.selectNodeContents(root);
  return selectedRange.compareBoundaryPoints(0, rootRange) === 0
    && selectedRange.compareBoundaryPoints(2, rootRange) === 0;
}

function isPlatformShortcut(
  event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">,
  key: string,
): boolean {
  return (event.metaKey || event.ctrlKey)
    && !event.altKey
    && !event.shiftKey
    && event.key.toLowerCase() === key;
}

function selectionFor(document: Document): Selection | null {
  return document.defaultView?.getSelection()
    ?? (typeof document.getSelection === "function" ? document.getSelection() : null);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!isElement(target)) return false;
  return target.isContentEditable
    || target.closest('[contenteditable]:not([contenteditable="false"])') !== null
    || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
}

function isDocumentLevelTarget(target: EventTarget | null): boolean {
  if (!isNode(target)) return false;
  const document = target.ownerDocument ?? (target.nodeType === 9 ? target as Document : null);
  return target === document || target === document?.documentElement || target === document?.body;
}

function isNode(target: EventTarget | null): target is Node {
  return target !== null && typeof target === "object" && "nodeType" in target;
}

function isElement(target: EventTarget | null): target is HTMLElement {
  return isNode(target)
    && target.nodeType === 1
    && "tagName" in target
    && "closest" in target;
}
