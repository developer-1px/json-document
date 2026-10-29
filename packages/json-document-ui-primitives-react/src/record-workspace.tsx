import { useRef, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Command } from "./controls.js";

/** A record work surface keeps navigation, reading and properties on independent scroll axes. */
export function RecordWorkspace({header, listHeader, list, detailHeader, detail, properties, hasSelection = true}: {
  readonly header?: ReactNode; readonly listHeader?: ReactNode; readonly list: ReactNode;
  readonly hasSelection?: boolean; readonly detailHeader?: ReactNode; readonly detail: ReactNode; readonly properties?: ReactNode;
}): ReactNode {
  const selectedTrigger = useRef<HTMLElement | null>(null);
  const detailHeading = useRef<HTMLElement | null>(null);
  const listPane = useRef<HTMLElement | null>(null);
  const isCompact = () => window.matchMedia?.("(max-width: 600px)").matches === true;
  const reveal = (element: HTMLElement | null) => {
    const panes = element?.closest<HTMLElement>('[data-record-region="panes"]');
    if (element && panes && isCompact()) panes.scrollTop += element.getBoundingClientRect().top - panes.getBoundingClientRect().top;
  };
  const openDetail = () => {detailHeading.current?.focus({preventScroll: true}); reveal(detailHeading.current);};
  const returnToList = () => {
    const target = selectedTrigger.current?.isConnected ? selectedTrigger.current : listPane.current?.querySelector<HTMLElement>('[data-ui-control="selectable"][aria-pressed="true"]');
    target?.focus({preventScroll: true});
    reveal(listPane.current);
  };
  return <div data-ui-component="record-workspace">
    {header && <header data-record-region="header">{header}</header>}
    <div data-record-region="panes">
      <section ref={listPane} aria-label="목록 탐색" data-record-region="list-pane" onClickCapture={event => {const item = (event.target as HTMLElement).closest<HTMLElement>('[data-ui-control="selectable"]'); if (item) {selectedTrigger.current = item; if (isCompact()) requestAnimationFrame(openDetail);}}} onKeyDown={event => {
        const item = (event.target as HTMLElement).closest<HTMLElement>('[data-ui-control="selectable"]');
        if (event.key === "Enter" && item) {selectedTrigger.current = item; requestAnimationFrame(openDetail);}
      }}>
        {listHeader && <header data-record-region="list-header">{listHeader}</header>}
        <div data-record-region="list-scroll">{list}</div>
      </section>
      <section aria-label="선택 항목 상세" data-record-region="detail-pane" onKeyDown={event => {
        if (event.key === "Escape" && !(event.target as HTMLElement).closest('form, [role="dialog"]') && selectedTrigger.current?.isConnected) {event.preventDefault(); returnToList();}
      }}>
        {hasSelection && detailHeader && <header ref={detailHeading} tabIndex={-1} data-record-region="detail-header"><div data-record-back><Command onClick={returnToList}><ChevronLeft size={16} aria-hidden="true" />목록으로</Command></div>{detailHeader}</header>}
        <div data-record-region="detail-scroll">{hasSelection ? detail : <p role="status">목록에서 항목을 선택하세요.</p>}</div>
      </section>
      {hasSelection && properties && <aside aria-label="항목 속성" data-record-region="properties">{properties}</aside>}
    </div>
  </div>;
}
