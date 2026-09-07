import { useEffect, useState } from "react";
import { createA2uiStreamingDocumentEngine, type A2uiStreamingDocumentEngine } from "@interactive-os/json-document-a2ui";
import { useReactConnector } from "@interactive-os/json-document-react";
import { Command } from "@interactive-os/json-document-ui-primitives-react";
import { Inspector } from "../../../shared/ui/inspector";
import { ConnectorDemoPage } from "../ConnectorDemoPage";

const fixture = [
  { version: "v0.9", createSurface: { surfaceId: "demo", catalogId: "example-catalog" } },
  { version: "v0.9", updateComponents: { surfaceId: "demo", components: [{ id: "root", component: "Text", text: { path: "/answer" } }] } },
  { version: "v0.9", updateDataModel: { surfaceId: "demo", path: "/answer", value: "Stream complete" } },
].map((message) => JSON.stringify(message)).join("\n");

export function A2uiConnectorDemoRoute() {
  const [engine, setEngine] = useState<A2uiStreamingDocumentEngine | null>(null);
  useEffect(() => {
    const current = createA2uiStreamingDocumentEngine();
    setEngine(current);
    return () => current.dispose();
  }, []);
  return <ConnectorDemoPage
    title="A2UI Connector"
    description="A2UI 메시지와 분할 JSONL을 편집 가능한 JSONDocument로 연결합니다."
    illustration="connector"
    install="npm i @interactive-os/json-document-a2ui @a2ui/web_core rxjs"
    connectionCode={{ language: "typescript", source: `import { createA2uiStreamingDocumentEngine } from "@interactive-os/json-document-a2ui";

const engine = createA2uiStreamingDocumentEngine();
const subscription = engine.document$.subscribe(render);
engine.write(chunk);
engine.complete(); // flush, ready for the next stream
subscription.unsubscribe();
engine.dispose();` }}
    connectionDescription="Catalog 정책과 UI는 Host가 정합니다. 메시지 검증, JSONL 경계와 문서 관찰은 Connector가 소유합니다."
  >
    {engine ? <A2uiConnectorFixture engine={engine} /> : null}
  </ConnectorDemoPage>;
}

function A2uiConnectorFixture({ engine }: { readonly engine: A2uiStreamingDocumentEngine }) {
  const value = useReactConnector(engine.document);
  const [phase, setPhase] = useState(0);
  return <section aria-label="A2UI streaming">
    <Command disabled={phase === 2} onClick={() => {
      if (phase === 0) engine.write(fixture.slice(0, 23));
      else { engine.write(fixture.slice(23)); engine.complete(); }
      setPhase((current) => current + 1);
    }}>{phase === 0 ? "첫 chunk 수신" : phase === 1 ? "나머지 수신·완료" : "수신 완료"}</Command>
    <p role="status">{phase === 0 ? "수신 대기" : phase === 1 ? "불완전한 JSONL은 아직 반영되지 않았습니다." : "Stream complete"}</p>
    <Inspector defaultOpen placement="inline" label="문서 확인" items={[{ label: "Canonical JSON", testId: "a2ui-document-json", value }]} />
  </section>;
}
