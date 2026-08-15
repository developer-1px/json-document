import { useEffect, useId, useState } from "react";
import { DisclosureButton, IconButton, ToggleButton } from "./interactive";
import { JsonInspector, type JsonInspectorProps } from "./json-inspector";
import { classes, ui } from "./styles";

export type InspectorItem = JsonInspectorProps;

export function Inspector(props: {
  readonly items: ReadonlyArray<InspectorItem>;
  readonly label?: string;
  readonly className?: string;
}) {
  const panelId = `inspector-${useId().replace(/:/g, "")}`;
  const [open, setOpen] = useState(false);
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

  return (
    <div className={classes("min-w-0", props.className)} data-inspector>
      <DisclosureButton
        expanded={open}
        controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
      </DisclosureButton>

      <aside
        id={panelId}
        hidden={!open}
        style={open ? undefined : { display: "none" }}
        aria-label={label}
        className={classes(
          "pointer-events-none fixed bottom-4 right-4 z-50 grid max-h-[calc(100vh-2rem)] w-[min(42rem,calc(100vw-2rem))] min-w-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden p-3 [&_button]:pointer-events-auto",
          ui.surface.overlay,
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className={ui.text.label}>Inspector</span>
          <IconButton label="Close inspector" onClick={() => setOpen(false)}>×</IconButton>
        </div>

        <div className="mb-3 flex min-w-0 flex-wrap gap-1" role="tablist" aria-label="Inspector values">
          {props.items.map((item, index) => (
            <ToggleButton
              key={item.testId}
              role="tab"
              pressed={index === activeIndex}
              aria-selected={index === activeIndex}
              aria-controls={`${panelId}-item-${index}`}
              onClick={() => setActiveTestId(item.testId)}
            >
              {item.label}
            </ToggleButton>
          ))}
        </div>

        <div className="min-h-0 min-w-0 overflow-auto">
          {props.items.map((item, index) => (
            <div
              id={`${panelId}-item-${index}`}
              key={item.testId}
              role="tabpanel"
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
