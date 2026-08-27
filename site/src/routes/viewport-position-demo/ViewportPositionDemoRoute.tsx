import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createViewportPositionSession, type ViewportPositionSession } from "@interactive-os/json-document-affordance";
import { createWebViewportPositionPorts } from "@interactive-os/json-document-web";
import { ActionButton } from "@interactive-os/json-document-ui-primitives-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { runtimeMarkdownStreamFixture } from "./runtime-markdown-stream.fixture";
import { viewportPositionDemoRecipe } from "./viewport-position-demo-styles";

const fixture = runtimeMarkdownStreamFixture;
const streamChunks: readonly Readonly<{ endOffset: number; delayMs: number }>[] = fixture.stream.chunks;
const targetKey = "submitted-request";
const requestedViewportOffset = 96;

const previousExchange = {
  request: "지난 분기 사용자 피드백에서 반복된 UI 문제를 정리해줘.",
  response: "긴 작업에서는 진행 상태보다 현재 읽던 위치를 잃는 문제가 더 자주 보고되었습니다. 특히 새 요청을 보낸 뒤 답변이 생성될 때 화면이 계속 아래로 밀리면 사용자는 질문과 답변의 시작을 함께 확인하기 어렵습니다.",
};

export function ViewportPositionDemoRoute() {
  const [submitted, setSubmitted] = useState(false);
  const [renderedText, setRenderedText] = useState("");
  const [chunkIndex, setChunkIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [owned, setOwned] = useState(false);
  const [tailRange, setTailRange] = useState(0);
  const [status, setStatus] = useState("Ready to submit the captured prompt");
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ViewportPositionSession<string> | null>(null);
  const stopVisibilityRef = useRef<(() => void) | null>(null);
  const startVisibilityRef = useRef<(() => void) | null>(null);
  const styles = viewportPositionDemoRecipe();

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (viewport === null || content === null) return;
    const ports = createWebViewportPositionPorts<string>({
      viewport,
      content,
      findTarget: (key) => viewport.querySelector<HTMLElement>(`[data-viewport-position-target-key="${key}"]`),
      findTailReserve: (key) => viewport.querySelector<HTMLElement>(`[data-viewport-position-tail-key="${key}"]`),
      createResizeObserver: (callback) => new ResizeObserver(callback),
      createMutationObserver: (callback) => new MutationObserver(callback),
      createVisibilityObserver: (callback, root) => new IntersectionObserver(
        (entries) => callback(entries.some((entry) => entry.isIntersecting)),
        { root: root as Element },
      ),
    });
    const session = createViewportPositionSession<string>({
      ...ports,
      onCancel: (reason) => {
        if (reason === "target-left-viewport") setStatus("Target left viewport · temporary scroll range removed");
      },
      onChange: (snapshot) => {
        setOwned(snapshot.owned);
        setTailRange(snapshot.tailReserve);
      },
    });
    sessionRef.current = session;
    startVisibilityRef.current = () => {
      stopVisibilityRef.current?.();
      stopVisibilityRef.current = ports.observeTargetVisibility(targetKey, (visible) => {
        sessionRef.current?.targetVisibilityChanged(visible);
      });
    };
    const stopLayout = ports.observeLayout(() => session.layoutChanged());
    return () => {
      stopLayout();
      stopVisibilityRef.current?.();
      session.cancel();
      sessionRef.current = null;
      startVisibilityRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (!submitted) return;
    sessionRef.current?.position(targetKey, requestedViewportOffset);
    startVisibilityRef.current?.();
    setStatus(`Target positioned at ${requestedViewportOffset}px · temporary scroll range created`);
  }, [submitted]);

  useEffect(() => {
    if (!playing || chunkIndex >= streamChunks.length) return;
    const chunk = streamChunks[chunkIndex]!;
    const timer = window.setTimeout(() => {
      setRenderedText(fixture.stream.document.slice(0, chunk.endOffset));
      setChunkIndex((current) => current + 1);
      setStatus(sessionRef.current?.getSnapshot().owned
        ? `Streaming while target stays at ${requestedViewportOffset}px · ${chunkIndex + 1}/${streamChunks.length}`
        : `Streaming after position control ended · ${chunkIndex + 1}/${streamChunks.length}`);
    }, chunk.delayMs);
    return () => window.clearTimeout(timer);
  }, [chunkIndex, playing]);

  useEffect(() => {
    if (!playing || chunkIndex < streamChunks.length) return;
    setPlaying(false);
    sessionRef.current?.complete();
    setStatus(sessionRef.current?.getSnapshot().owned
      ? "Captured response complete · requested position retained"
      : "Captured response complete · position control ended");
  }, [chunkIndex, playing]);

  function submitCapturedPrompt() {
    setRenderedText("");
    setChunkIndex(0);
    setPlaying(true);
    if (submitted) {
      sessionRef.current?.position(targetKey, requestedViewportOffset);
      startVisibilityRef.current?.();
      setStatus(`Target positioned at ${requestedViewportOffset}px · temporary scroll range created`);
    } else {
      setSubmitted(true);
    }
  }

  return (
    <DemoPage documentation={<PageHeader title="Viewport position" illustration="cursor">특정 오브젝트를 원하는 화면 위치로 보내고, 부족한 하단 scroll range를 임시로 만들며, 오브젝트가 화면을 벗어나면 함께 해제합니다.</PageHeader>}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="viewport-title">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className={ui.text.label}>Security-filtered production capture</p>
              <h2 id="viewport-title" className={ui.text.heading}>Long-running agent response</h2>
            </div>
            <p className={ui.text.meta}>{fixture.capture.sourceTextDeltaCount.toLocaleString()} deltas · {streamChunks.length} chunks</p>
          </div>
          <div ref={viewportRef} data-testid="viewport" className={styles.viewport()}>
            <div ref={contentRef} className="grid gap-4">
              <article className={styles.userEntry()}>
                <p className={ui.text.label}>You</p>
                <p className="text-sm leading-6">{previousExchange.request}</p>
              </article>
              <article className={styles.assistantEntry()}>
                <p className={ui.text.label}>Assistant</p>
                <p className="text-sm leading-6">{previousExchange.response}</p>
              </article>
              {submitted ? (
                <>
                  <article data-viewport-position-target-key={targetKey} className={styles.userEntry()}>
                    <p className={ui.text.label}>You · submitted from captured run</p>
                    <p className="text-sm leading-6">{fixture.request.text}</p>
                  </article>
                  <article className={styles.assistantEntry()}>
                    <p className={ui.text.label}>Assistant · live response</p>
                    {renderedText.length === 0
                      ? <p className={ui.text.meta}>응답을 시작하는 중…</p>
                      : <div className={styles.markdown()}><ReactMarkdown remarkPlugins={[remarkGfm]}>{renderedText}</ReactMarkdown></div>}
                  </article>
                  <div aria-hidden="true" data-viewport-position-tail-key={targetKey} className={styles.reserve()} />
                </>
              ) : (
                <div className={styles.readyState()}>Submit the captured prompt to position its object and create only the missing trailing scroll range.</div>
              )}
            </div>
          </div>
        </section>
        <aside className={classes("grid content-start gap-3 p-4", ui.surface.raised)} aria-labelledby="viewport-evidence">
          <h2 id="viewport-evidence" className={ui.text.heading}>Runtime evidence</h2>
          <dl className={styles.evidence()}>
            <div><dt>Completeness</dt><dd>{fixture.capture.completeness}</dd></div>
            <div><dt>Security</dt><dd>{fixture.capture.securityFilter}</dd></div>
            <div><dt>Source entries</dt><dd>{fixture.capture.sourceEntryCount.toLocaleString()}</dd></div>
            <div><dt>Dropped</dt><dd>{fixture.capture.droppedEntries}</dd></div>
          </dl>
          <ActionButton onClick={submitCapturedPrompt}>{submitted ? "Replay captured response" : "Submit captured prompt"}</ActionButton>
          <p aria-live="polite" data-testid="viewport-status" className={ui.text.body}>{status}</p>
          <p className={ui.text.meta}>position control: {owned ? "active" : "released"}</p>
          <p className={ui.text.meta}>requested viewport offset: {requestedViewportOffset}px</p>
          <p className={ui.text.meta}>temporary trailing range: <span data-testid="tail-range">{tailRange}px</span></p>
          <p className={ui.text.meta}>chunk {chunkIndex}/{streamChunks.length}</p>
        </aside>
      </div>
    </DemoPage>
  );
}
