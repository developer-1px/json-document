import { useLayoutEffect, useRef, useState } from "react";
import { createViewportInteractionSession, type ViewportInteractionSession } from "@interactive-os/json-document-affordance";
import { createWebViewportInteractionPorts } from "@interactive-os/json-document-web";
import { ActionButton } from "@interactive-os/json-document-ui-primitives-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { viewportDemoRecipe } from "./viewport-demo-styles";

const initialRows = Array.from({ length: 18 }, (_, index) => ({ id: `event-${index + 1}`, label: `Event ${index + 1}` }));

export function ViewportInteractionDemoRoute() {
  const [rows, setRows] = useState(initialRows);
  const [following, setFollowing] = useState(true);
  const [status, setStatus] = useState("Follow end");
  const viewportRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ViewportInteractionSession<string> | null>(null);
  const styles = viewportDemoRecipe();

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    const ports = createWebViewportInteractionPorts<string>({
      viewport,
      content: viewport.firstElementChild ?? viewport,
      findAnchor: (key) => viewport.querySelector(`[data-row-id="${key}"]`),
      createResizeObserver: (callback) => new ResizeObserver(callback),
      createMutationObserver: (callback) => new MutationObserver(callback),
    });
    const session: ViewportInteractionSession<string> = createViewportInteractionSession({
      ...ports,
      onCancel: (reason) => setStatus(reason === "user-interruption" ? "User owns scroll" : reason),
      onSettle: () => setStatus(sessionRef.current?.getSnapshot().following ? "Follow end" : "Anchor preserved"),
    });
    session.setFollowing(true);
    sessionRef.current = session;
    const stopLayout = ports.observeLayout(() => session.layoutChanged());
    const stopIntent = ports.observeUserScrollIntent(() => { session.interrupt(); setFollowing(false); });
    viewport.scrollTop = viewport.scrollHeight;
    return () => { stopLayout(); stopIntent(); session.cancel(); sessionRef.current = null; };
  }, []);

  function prepend() {
    const viewport = viewportRef.current;
    const anchor = viewport === null ? null : [...viewport.querySelectorAll<HTMLElement>("[data-row-id]")]
      .find((row) => row.getBoundingClientRect().bottom > viewport.getBoundingClientRect().top);
    if (anchor === null || anchor === undefined) return;
    sessionRef.current?.setFollowing(false);
    sessionRef.current?.begin({ anchorKey: anchor.dataset.rowId! });
    setFollowing(false);
    setRows((current) => [
      { id: `earlier-${current.length}-a`, label: "Earlier A" },
      { id: `earlier-${current.length}-b`, label: "Earlier B" },
      { id: `earlier-${current.length}-c`, label: "Earlier C" },
      ...current,
    ]);
  }

  function stream() {
    sessionRef.current?.begin();
    setRows((current) => [...current, { id: `stream-${current.length + 1}`, label: `Stream ${current.length + 1}` }]);
  }

  function resume() {
    sessionRef.current?.setFollowing(true);
    sessionRef.current?.begin();
    setFollowing(true);
    setStatus("Follow end");
  }

  return (
    <DemoPage documentation={<PageHeader title="Viewport Interaction" illustration="cursor">콘텐츠가 위와 아래에서 바뀌어도 논리 위치와 사용자 스크롤 의도를 지킵니다.</PageHeader>}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="viewport-title">
          <h2 id="viewport-title" className={classes("mb-3", ui.text.heading)}>Dynamic viewport</h2>
          <div ref={viewportRef} data-testid="viewport" className={styles.viewport()}>
            <ol className="grid gap-2">
              {rows.map((row) => <li key={row.id} data-row-id={row.id} className={styles.row()}>{row.label}</li>)}
            </ol>
          </div>
        </section>
        <section className={classes("grid content-start gap-3 p-4", ui.surface.raised)} aria-labelledby="viewport-actions">
          <h2 id="viewport-actions" className={ui.text.heading}>Real-world changes</h2>
          <ActionButton onClick={prepend}>Prepend 3 rows</ActionButton>
          <ActionButton onClick={stream}>Append stream chunk</ActionButton>
          <ActionButton onClick={resume}>Resume follow</ActionButton>
          <p aria-live="polite" data-testid="viewport-status">{status}</p>
          <p className={ui.text.meta}>following: {String(following)}</p>
        </section>
      </div>
    </DemoPage>
  );
}
