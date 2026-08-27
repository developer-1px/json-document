import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createViewportInteractionSession, type ViewportInteractionSession } from "@interactive-os/json-document-affordance";
import { createWebViewportInteractionPorts } from "@interactive-os/json-document-web";
import { ActionButton } from "@interactive-os/json-document-ui-primitives-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { cstarViewportHistory } from "./cstar-viewport-history.fixture";
import { cstarViewportStreamCapture } from "./cstar-viewport-stream.fixture";
import { viewportDemoRecipe } from "./viewport-demo-styles";

const capture = cstarViewportStreamCapture;
const streamChunks: readonly Readonly<{ endOffset: number; delayMs: number }>[] = capture.stream.chunks;

export function ViewportInteractionDemoRoute() {
  const [historyVisible, setHistoryVisible] = useState(false);
  const [renderedText, setRenderedText] = useState<string>(capture.stream.document);
  const [chunkIndex, setChunkIndex] = useState<number>(streamChunks.length);
  const [playing, setPlaying] = useState(false);
  const [following, setFollowing] = useState(true);
  const [unseenChunks, setUnseenChunks] = useState(0);
  const [status, setStatus] = useState("Captured run complete");
  const viewportRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ViewportInteractionSession<string> | null>(null);
  const settleLabelRef = useRef<string | null>(null);
  const styles = viewportDemoRecipe();

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    const ports = createWebViewportInteractionPorts<string>({
      viewport,
      content: viewport.firstElementChild ?? viewport,
      findAnchor: (key) => viewport.querySelector(`[data-entry-id="${key}"]`),
      createResizeObserver: (callback) => new ResizeObserver(callback),
      createMutationObserver: (callback) => new MutationObserver(callback),
    });
    const session = createViewportInteractionSession<string>({
      ...ports,
      onCancel: (reason) => {
        if (reason === "user-interruption") setStatus("Reading history · live follow paused");
      },
      onSettle: () => {
        if (settleLabelRef.current !== null) setStatus(settleLabelRef.current);
        settleLabelRef.current = null;
      },
    });
    session.setFollowing(true);
    sessionRef.current = session;
    const stopLayout = ports.observeLayout(() => session.layoutChanged());
    const stopIntent = ports.observeUserScrollIntent(() => {
      session.interrupt();
      setFollowing(false);
    });
    viewport.scrollTop = viewport.scrollHeight;
    return () => { stopLayout(); stopIntent(); session.cancel(); sessionRef.current = null; };
  }, []);

  useEffect(() => {
    if (!playing || chunkIndex >= streamChunks.length) return;
    const chunk = streamChunks[chunkIndex]!;
    const timer = window.setTimeout(() => {
      const isFollowing = sessionRef.current?.getSnapshot().following ?? false;
      sessionRef.current?.begin();
      setRenderedText(capture.stream.document.slice(0, chunk.endOffset));
      setChunkIndex((current) => current + 1);
      if (!isFollowing) setUnseenChunks((current) => current + 1);
      setStatus(isFollowing
        ? `Replaying captured stream · ${chunkIndex + 1}/${streamChunks.length}`
        : "Reading history · new output arriving");
    }, chunk.delayMs);
    return () => window.clearTimeout(timer);
  }, [chunkIndex, playing]);

  useEffect(() => {
    if (!playing || chunkIndex < streamChunks.length) return;
    setPlaying(false);
    setStatus(following ? "Captured run complete" : "Run complete · return to latest");
  }, [chunkIndex, following, playing]);

  function firstVisibleEntry(): HTMLElement | null {
    const viewport = viewportRef.current;
    if (viewport === null) return null;
    const top = viewport.getBoundingClientRect().top;
    return [...viewport.querySelectorAll<HTMLElement>("[data-entry-id]")]
      .find((entry) => entry.getBoundingClientRect().bottom > top) ?? null;
  }

  function loadEarlierHistory() {
    const anchor = firstVisibleEntry();
    if (anchor === null || historyVisible) return;
    sessionRef.current?.setFollowing(false);
    settleLabelRef.current = "Earlier Cstar history loaded · anchor preserved";
    sessionRef.current?.begin({ anchorKey: anchor.dataset.entryId! });
    setFollowing(false);
    setHistoryVisible(true);
  }

  function replayCapture() {
    sessionRef.current?.setFollowing(true);
    sessionRef.current?.begin();
    setFollowing(true);
    setUnseenChunks(0);
    setRenderedText("");
    setChunkIndex(0);
    setPlaying(true);
    setStatus("Replaying security-filtered Cstar capture");
  }

  function returnToLatest() {
    sessionRef.current?.setFollowing(true);
    settleLabelRef.current = playing ? "Following captured stream" : "Captured run complete";
    sessionRef.current?.begin();
    setFollowing(true);
    setUnseenChunks(0);
  }

  return (
    <DemoPage documentation={<PageHeader title="Cstar · Long-running agent session" illustration="cursor">실제 Codex runtime stream capture를 재생해 prepend, streaming growth와 사용자 scroll ownership을 검증합니다.</PageHeader>}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="viewport-title">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className={ui.text.label}>Cstar browser-memory capture</p>
              <h2 id="viewport-title" className={ui.text.heading}>2026년 AI 에이전트 제품 설계 원칙</h2>
            </div>
            <p className={ui.text.meta}>{capture.capture.sourceTextDeltaCount.toLocaleString()} deltas · {streamChunks.length} captured chunks</p>
          </div>
          <div ref={viewportRef} data-testid="viewport" className={styles.viewport()}>
            <div className="grid gap-4">
              {historyVisible && cstarViewportHistory.map((entry) => (
                <article key={entry.id} data-entry-id={entry.id} className={entry.role === "user" ? styles.userEntry() : styles.assistantEntry()}>
                  <p className={ui.text.label}>{entry.role === "user" ? "You" : "Cstar"}</p>
                  <p className="whitespace-pre-wrap text-sm leading-6">{entry.content}</p>
                </article>
              ))}
              <article data-entry-id="captured-request" className={styles.userEntry()}>
                <p className={ui.text.label}>You · captured {new Date(capture.request.submittedAt).toLocaleString("ko-KR")}</p>
                <p className="text-sm leading-6">{capture.request.text}</p>
              </article>
              <article data-entry-id="captured-response" className={styles.assistantEntry()}>
                <p className={ui.text.label}>Cstar · live response</p>
                {renderedText.length === 0
                  ? <p className={ui.text.meta}>응답을 시작하는 중…</p>
                  : <div className={styles.markdown()}><ReactMarkdown remarkPlugins={[remarkGfm]}>{renderedText}</ReactMarkdown></div>}
              </article>
            </div>
          </div>
        </section>
        <aside className={classes("grid content-start gap-3 p-4", ui.surface.raised)} aria-labelledby="viewport-evidence">
          <h2 id="viewport-evidence" className={ui.text.heading}>Captured evidence</h2>
          <dl className={styles.evidence()}>
            <div><dt>Completeness</dt><dd>{capture.capture.completeness}</dd></div>
            <div><dt>Security</dt><dd>{capture.capture.securityFilter}</dd></div>
            <div><dt>Source entries</dt><dd>{capture.capture.sourceEntryCount.toLocaleString()}</dd></div>
            <div><dt>Dropped</dt><dd>{capture.capture.droppedEntries}</dd></div>
          </dl>
          <ActionButton onClick={replayCapture}>Replay actual capture</ActionButton>
          <ActionButton onClick={loadEarlierHistory} disabled={historyVisible}>Load earlier Cstar history</ActionButton>
          <ActionButton onClick={returnToLatest}>Return to latest</ActionButton>
          {unseenChunks > 0 && <p className={styles.newOutput()}>{unseenChunks} captured chunks arrived</p>}
          <p aria-live="polite" data-testid="viewport-status" className={ui.text.body}>{status}</p>
          <p className={ui.text.meta}>following: {String(following)} · chunk {chunkIndex}/{streamChunks.length}</p>
        </aside>
      </div>
    </DemoPage>
  );
}
