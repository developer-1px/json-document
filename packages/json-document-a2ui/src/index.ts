import { appendSegment, buildPointer, createJSONDocument, parsePointer, type JSONDocument, type JSONPatchOperation, type JSONValue } from "@interactive-os/json-document";
import { A2uiMessageSchema } from "@a2ui/web_core/v0_9";
import { BehaviorSubject, Subject, type Observable } from "rxjs";

export type A2uiComponent = Readonly<{ id?: string | undefined; component: string; [key: string]: unknown }>;
export type A2uiSurfaceDocument = Readonly<{
  catalogId: string;
  theme?: JSONValue;
  sendDataModel?: boolean;
  components: Readonly<Record<string, A2uiComponent>>;
  dataModel: JSONValue;
}>;
export type A2uiStreamingDocument = Readonly<{ surfaces: Readonly<Record<string, A2uiSurfaceDocument>> }>;

/** Host catalog policy. The Connector does not choose a renderer or product catalog. */
export interface A2uiStreamingDocumentOptions {
  readonly initialDataModel?: JSONValue;
  readonly validateComponent?: (component: A2uiComponent, surface: A2uiSurfaceDocument) => void;
}

export interface A2uiStreamingDocumentEngine {
  readonly message$: Observable<A2uiMessage>;
  readonly document$: Observable<A2uiStreamingDocument>;
  readonly document: JSONDocument;
  dispatch(message: unknown): void;
  write(chunk: string): void;
  complete(): void;
  dispose(): void;
}

/** Validates the external v0.9 envelope, independently of Host catalog policy. */
export function parseA2uiMessage(candidate: unknown): A2uiMessage {
  return A2uiMessageSchema.parse(candidate);
}

export function createA2uiStreamingDocumentEngine(options: A2uiStreamingDocumentOptions = {}): A2uiStreamingDocumentEngine {
  const document = createJSONDocument({ surfaces: {} });
  const initialDataModel = createJSONDocument(options.initialDataModel === undefined ? {} : options.initialDataModel).value;
  const input = new Subject<A2uiMessage>();
  const state = new BehaviorSubject(document.value as A2uiStreamingDocument);
  const unsubscribe = document.subscribe(() => state.next(document.value as A2uiStreamingDocument));
  let jsonlBuffer = "";
  let disposed = false;
  const assertActive = () => {
    if (disposed) throw new Error("a2ui.disposed");
  };
  const dispatch = (candidate: unknown) => {
    assertActive();
    const message = parseA2uiMessage(candidate);
    const operations = messageOperations(document, message, initialDataModel, options.validateComponent);
    if (operations.length === 0) { input.next(message); return; }
    const committed = document.commit(operations, { metadata: { protocol: "a2ui/v0.9" } });
    if (!committed.ok) throw new Error(committed.reason ?? committed.code);
    input.next(message);
  };
  const write = (chunk: string) => {
    assertActive();
    jsonlBuffer += chunk;
    const lines = jsonlBuffer.split("\n");
    jsonlBuffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) dispatch(JSON.parse(line));
  };
  const complete = () => {
    assertActive();
    const tail = jsonlBuffer;
    jsonlBuffer = "";
    if (tail.trim()) dispatch(JSON.parse(tail));
  };
  return {
    message$: input.asObservable(),
    document$: state.asObservable(),
    document,
    dispatch,
    write,
    complete,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      jsonlBuffer = "";
      unsubscribe();
      input.complete();
      state.complete();
    },
  };
}

function messageOperations(document: JSONDocument, message: A2uiMessage, initialDataModel: JSONValue, validateComponent: A2uiStreamingDocumentOptions["validateComponent"]): JSONPatchOperation[] {
  if ("createSurface" in message) {
    const { surfaceId, catalogId, theme, sendDataModel } = message.createSurface;
    return [upsert(document, surfacePath(surfaceId), {
      catalogId,
      ...(theme === undefined ? {} : { theme: theme as JSONValue }),
      ...(sendDataModel === undefined ? {} : { sendDataModel }),
      components: {},
      dataModel: initialDataModel,
    })];
  }
  if ("deleteSurface" in message) return document.at(surfacePath(message.deleteSurface.surfaceId)).ok
    ? [{ op: "remove", path: surfacePath(message.deleteSurface.surfaceId) }]
    : [];
  if ("updateComponents" in message) return message.updateComponents.components.flatMap((component, index) => {
    const surface = document.at(surfacePath(message.updateComponents.surfaceId));
    if (surface.ok) validateComponent?.(component, surface.value as A2uiSurfaceDocument);
    const id = component.id ?? `anonymous-${index}`;
    return [upsert(document, buildPointer(["surfaces", message.updateComponents.surfaceId, "components", id]), component as JSONValue)];
  });
  const { surfaceId, path = "", value } = message.updateDataModel;
  const base = appendSegment(surfacePath(surfaceId), "dataModel");
  const target = path === "/" || path === "" ? base : buildPointer([...parsePointer(base), ...parsePointer(path)]);
  if (value === undefined) {
    if (!document.at(target).ok) return [];
    return path === "/" || path === "" ? [{ op: "replace", path: target, value: null }] : [{ op: "remove", path: target }];
  }
  return [upsert(document, target, value as JSONValue)];
}

function upsert(document: JSONDocument, path: string, value: JSONValue): JSONPatchOperation {
  return { op: document.at(path).ok ? "replace" : "add", path, value };
}

function surfacePath(surfaceId: string) { return buildPointer(["surfaces", surfaceId]); }

/** The validated SDK schema output, including optional envelope fields. */
export type A2uiMessage = ReturnType<typeof A2uiMessageSchema.parse>;
