import { useEffect, useId, useState } from "react";
import { DisclosureButton, IconButton, Tabs } from "@interactive-os/json-document-ui-primitives-react";
import { JsonInspector, type JsonInspectorProps } from "./json-inspector";
import { classes, ui } from "./styles";

export type InspectorItem = JsonInspectorProps;

export function Inspector(props: {
  readonly items: ReadonlyArray<InspectorItem>;
  readonly label?: string;
  readonly className?: string;
  readonly placement?: "overlay" | "inline";
  readonly defaultOpen?: boolean;
}) {
  const panelId = `inspector-${useId().replace(/:/g, "")}`;
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  const [activeTestId, setActiveTestId] = useState(props.items[0]?.testId ?? "");
  const activeIndex = Math.max(0, props.items.findIndex((item) => item.testId === activeTestId));
  const label = props.label ?? "Inspect editing state";

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  useEffect(() => {
    if (props.items.some((item) => item.testId === activeTestId)) return;
    setActiveTestId(props.items[0]?.testId ?? "");
  }, [activeTestId, props.items]);

  if (props.items.length === 0) return null;

  const inline = props.placement === "inline";

  return (
    <div className={classes("min-w-0", props.className)} data-inspector>
      <DisclosureButton
        expanded={open}
        controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <span aria-hidden="true" className={ui.interactive.chevron}>⌄</span>
      </DisclosureButton>

      <aside
        id={panelId}
        hidden={!open}
        style={open ? undefined : { display: "none" }}
        aria-label={label}
        className={inline
          ? "mt-3 grid min-w-0 gap-3"
          : classes(
            "pointer-events-none fixed bottom-4 right-4 z-50 grid max-h-[calc(100vh-2rem)] w-[min(42rem,calc(100vw-2rem))] min-w-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden p-3 [&_button]:pointer-events-auto",
            ui.surface.overlay,
          )}
      >
        {inline ? null : (
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className={ui.text.label}>Inspector</span>
            <IconButton label="Close inspector" onClick={() => setOpen(false)}>×</IconButton>
          </div>
        )}

        <Tabs
          className="mb-3 flex min-w-0 flex-wrap gap-1"
          label="Inspector values"
          value={props.items[activeIndex]!.testId}
          options={props.items.map((item) => ({ id: item.testId, label: item.label }))}
          onValueChange={setActiveTestId}
          tabId={(testId) => `${panelId}-tab-${testId}`}
          panelId={(_testId, index) => `${panelId}-item-${index}`}
        />

        <div className="min-h-0 min-w-0 overflow-auto">
          {props.items.map((item, index) => (
            <div
              id={`${panelId}-item-${index}`}
              key={item.testId}
              role="tabpanel"
              aria-labelledby={`${panelId}-tab-${item.testId}`}
              hidden={index !== activeIndex}
            >
              <JsonInspector {...item} className={classes("min-h-0", item.className)} />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
