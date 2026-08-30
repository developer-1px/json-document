import { createJSONDocument, type JSONDocument, type JSONPatchOperation, type JSONValue } from "@interactive-os/json-document";
import { A2uiMessageSchema, type A2uiMessage } from "@a2ui/web_core/v0_9";
import { BehaviorSubject, Subject, type Observable } from "rxjs";
import { A2UI_BASIC_CATALOG_ID, validateBasicCatalogComponent } from "./basic-catalog";

export const HANDS_CATALOG_ID = "https://interactive-os.dev/catalogs/hands/v1";

export type A2uiComponent = Readonly<{ id?: string; component: string; [key: string]: unknown }>;
export type A2uiSurfaceDocument = Readonly<{
  catalogId: string;
  theme?: JSONValue;
  sendDataModel?: boolean;
  components: Readonly<Record<string, A2uiComponent>>;
  dataModel: JSONValue;
}>;
export type A2uiStreamingDocument = Readonly<{ surfaces: Readonly<Record<string, A2uiSurfaceDocument>> }>;

export interface A2uiStreamingDocumentEngine {
  readonly message$: Observable<A2uiMessage>;
  readonly document$: Observable<A2uiStreamingDocument>;
  readonly document: JSONDocument;
  dispatch(message: A2uiMessage): void;
  write(chunk: string): void;
  complete(): void;
  dispose(): void;
}

export function createA2uiStreamingDocumentEngine(): A2uiStreamingDocumentEngine {
  const document = createJSONDocument({ surfaces: {} });
  const input = new Subject<A2uiMessage>();
  const state = new BehaviorSubject(document.value as A2uiStreamingDocument);
  let jsonlBuffer = "";
  const dispatch = (candidate: A2uiMessage) => {
    const message = A2uiMessageSchema.parse(candidate);
    const operations = messageOperations(document, message);
    if (operations.length === 0) { input.next(message); return; }
    const committed = document.commit(operations, { metadata: { protocol: "a2ui/v0.9" } });
    if (!committed.ok) throw new Error(committed.reason ?? committed.code);
    input.next(message);
    state.next(document.value as A2uiStreamingDocument);
  };
  const write = (chunk: string) => {
    jsonlBuffer += chunk;
    const lines = jsonlBuffer.split("\n");
    jsonlBuffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) dispatch(JSON.parse(line));
  };
  const complete = () => {
    if (jsonlBuffer.trim()) dispatch(JSON.parse(jsonlBuffer));
    jsonlBuffer = "";
  };
  return {
    message$: input.asObservable(),
    document$: state.asObservable(),
    document,
    dispatch,
    write,
    complete,
    dispose: () => { input.complete(); state.complete(); },
  };
}

function messageOperations(document: JSONDocument, message: A2uiMessage): JSONPatchOperation[] {
  if ("createSurface" in message) {
    const { surfaceId, catalogId, theme, sendDataModel } = message.createSurface;
    return [upsert(document, surfacePath(surfaceId), {
      catalogId,
      ...(theme === undefined ? {} : { theme: theme as JSONValue }),
      ...(sendDataModel === undefined ? {} : { sendDataModel }),
      components: {},
      dataModel: { content: {}, tools: {}, artifacts: {} },
    })];
  }
  if ("deleteSurface" in message) return document.at(surfacePath(message.deleteSurface.surfaceId)).ok
    ? [{ op: "remove", path: surfacePath(message.deleteSurface.surfaceId) }]
    : [];
  if ("updateComponents" in message) return message.updateComponents.components.flatMap((component, index) => {
    const surface = document.at(surfacePath(message.updateComponents.surfaceId));
    if (surface.ok && (surface.value as { catalogId?: unknown }).catalogId === A2UI_BASIC_CATALOG_ID) validateBasicCatalogComponent(component);
    const id = component.id ?? `anonymous-${index}`;
    return [upsert(document, `${surfacePath(message.updateComponents.surfaceId)}/components/${escapeToken(id)}`, component as JSONValue)];
  });
  const { surfaceId, path = "", value } = message.updateDataModel;
  const target = `${surfacePath(surfaceId)}/dataModel${path === "/" ? "" : path}`;
  if (value === undefined) {
    if (!document.at(target).ok) return [];
    return path === "/" || path === "" ? [{ op: "replace", path: target, value: null }] : [{ op: "remove", path: target }];
  }
  return [upsert(document, target, value as JSONValue)];
}

function upsert(document: JSONDocument, path: string, value: JSONValue): JSONPatchOperation {
  return { op: document.at(path).ok ? "replace" : "add", path, value };
}

function surfacePath(surfaceId: string) { return `/surfaces/${escapeToken(surfaceId)}`; }
function escapeToken(token: string) { return token.replace(/~/g, "~0").replace(/\//g, "~1"); }

export type { A2uiMessage };
