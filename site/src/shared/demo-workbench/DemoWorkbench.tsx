import { useEffect, useId, useState, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Tabs } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../ui/styles";
import { ActionLink } from "../ui/interactive";
import { Command } from "@interactive-os/json-document-ui-primitives-react";
import { ShikiSourceCodeBlock } from "./ShikiSourceCodeBlock";
import { demoEntrySource, discoverDemoSources, type DemoSourceFile } from "./demo-sources";

type WorkbenchTab = "demo" | number;

export function DemoWorkbench(props: {
  readonly children: ReactNode;
  readonly source: string;
}) {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("demo");
  const [expanded, setExpanded] = useState(false);
  const [sources, setSources] = useState<ReadonlyArray<DemoSourceFile>>(() => [demoEntrySource(props.source)]);
  const id = useId();
  const tabs: ReadonlyArray<{ readonly key: WorkbenchTab; readonly label: string }> = [
    { key: "demo", label: "Demo" },
    ...sources.map((source, index) => ({ key: index, label: source.path.split("/").at(-1) ?? source.path })),
  ];
  const activeSourceIndex = typeof activeTab === "number" ? activeTab : undefined;
  const activeSource = activeSourceIndex === undefined ? undefined : sources[activeSourceIndex];
  const [sourceText, setSourceText] = useState<Readonly<Record<string, string>>>({});
  const activeSourceText = activeSource === undefined ? undefined : sourceText[activeSource.path];

  useEffect(() => {
    setActiveTab("demo");
    setSources([demoEntrySource(props.source)]);
    setSourceText({});
  }, [props.source]);

  useEffect(() => {
    if (!expanded) return;
    const close = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [expanded]);

  useEffect(() => {
    if (activeSourceIndex === undefined) return;
    let current = true;
    void discoverDemoSources(props.source).then((discovered) => {
      if (current) setSources(discovered);
    });
    return () => { current = false; };
  }, [activeSourceIndex, props.source]);

  useEffect(() => {
    if (activeSource === undefined || activeSourceText !== undefined) return;
    let current = true;
    void activeSource.load().then((source) => {
      if (current) setSourceText((loaded) => ({ ...loaded, [activeSource.path]: source }));
    });
    return () => { current = false; };
  }, [activeSource?.path, activeSourceText]);

  return (
    <section className={classes("min-w-0", ui.product.frame, expanded && "fixed inset-3 z-50 overflow-auto bg-background-canvas shadow-overlay")} aria-label="Demo workbench" data-expanded={expanded || undefined}>
      <div className={classes(ui.demoWorkbench.header, "flex items-center justify-between gap-2")}>
        <Tabs
          className={ui.demoWorkbench.tabList}
          tabClassName={ui.demoWorkbench.tab}
          label="Demo and source files"
          value={activeTab}
          options={tabs.map((tab) => ({ id: tab.key, label: tab.label }))}
          onValueChange={setActiveTab}
          tabId={(_tab, index) => `${id}-tab-${index}`}
          panelId={(_tab, index) => `${id}-panel-${index}`}
        />
        <Command label={expanded ? "Restore demo size" : "Expand demo"} aria-pressed={expanded} onClick={() => setExpanded((current) => !current)}>
          {expanded ? <Minimize2 aria-hidden="true" size={16} /> : <Maximize2 aria-hidden="true" size={16} />}
        </Command>
      </div>

      <div
        id={`${id}-panel-0`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-0`}
        className={ui.demoWorkbench.panel}
        hidden={activeTab !== "demo"}
      >
        {props.children}
      </div>
      {activeSourceIndex === undefined || activeSource === undefined ? null : (
        <div
          id={`${id}-panel-${activeSourceIndex + 1}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${activeSourceIndex + 1}`}
          className={ui.demoWorkbench.panel}
        >
          <div className="min-w-0 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className={classes("m-0 font-mono", ui.text.meta)}>{activeSource.path}</p>
              {activeSource.referencePath === undefined ? null : (
                <ActionLink href={activeSource.referencePath} className={ui.text.meta}>API Reference</ActionLink>
              )}
            </div>
            {activeSourceText === undefined ? (
              <p className={classes("m-0 p-3", ui.text.meta)}>Loading source…</p>
            ) : (
              <ShikiSourceCodeBlock language={activeSource.language} source={activeSourceText} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
