import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { CodeBlock } from "../ui/code-block";
import { classes, ui } from "../ui/styles";
import type { DemoSourceFile } from "./demo-sources";

type WorkbenchTab = "demo" | number;

export function DemoWorkbench(props: {
  readonly children: ReactNode;
  readonly sources: ReadonlyArray<DemoSourceFile>;
}) {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("demo");
  const id = useId();
  const tabs: ReadonlyArray<{ readonly key: WorkbenchTab; readonly label: string }> = [
    { key: "demo", label: "Demo" },
    ...props.sources.map((source, index) => ({ key: index, label: source.path.split("/").at(-1) ?? source.path })),
  ];
  const activeSourceIndex = typeof activeTab === "number" ? activeTab : undefined;
  const activeSource = activeSourceIndex === undefined ? undefined : props.sources[activeSourceIndex];
  const [sourceText, setSourceText] = useState<Readonly<Record<string, string>>>({});
  const activeSourceText = activeSource === undefined ? undefined : sourceText[activeSource.path];

  useEffect(() => {
    if (activeSource === undefined || activeSourceText !== undefined) return;
    let current = true;
    void activeSource.load().then((source) => {
      if (current) setSourceText((loaded) => ({ ...loaded, [activeSource.path]: source }));
    });
    return () => { current = false; };
  }, [activeSource?.path, activeSourceText]);

  function selectNeighbor(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (direction === 0) return;
    event.preventDefault();
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIndex]!.key);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]")[nextIndex]?.focus();
  }

  return (
    <section className={classes("min-w-0 overflow-hidden", ui.product.frame)} aria-label="Demo workbench">
      <div
        className="flex overflow-x-auto border-b border-pencil-light/40 bg-paper-warm px-2 pt-2"
        role="tablist"
        aria-label="Demo and source files"
      >
        {tabs.map((tab, index) => {
          const selected = tab.key === activeTab;
          return (
            <button
              key={String(tab.key)}
              id={`${id}-tab-${index}`}
              type="button"
              role="tab"
              aria-controls={`${id}-panel-${index}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className="-mb-px shrink-0 cursor-pointer border-x-0 border-b-2 border-t-0 border-transparent bg-transparent px-3 py-2 font-mono text-xs text-pencil outline-none hover:text-ink-strong aria-selected:border-impact aria-selected:bg-paper aria-selected:text-ink-strong focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-impact/25"
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(event) => selectNeighbor(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id={`${id}-panel-0`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-0`}
        className="min-w-0 bg-paper"
        hidden={activeTab !== "demo"}
      >
        {props.children}
      </div>
      {activeSourceIndex === undefined || activeSource === undefined ? null : (
        <div
          id={`${id}-panel-${activeSourceIndex + 1}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${activeSourceIndex + 1}`}
          className="min-w-0 bg-paper"
        >
          <div className="min-w-0 p-3">
            <p className={classes("mb-2 mt-0 font-mono", ui.text.meta)}>{activeSource.path}</p>
            {activeSourceText === undefined ? (
              <p className={classes("m-0 p-3", ui.text.meta)}>Loading source…</p>
            ) : (
              <CodeBlock language={activeSource.language} size="content" source={activeSourceText} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
