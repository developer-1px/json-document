import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { DisclosureButton, Command, Popover, Tabs } from "@interactive-os/json-document-ui-primitives-react";
import { JsonInspector, type JsonInspectorProps } from "./json-inspector";
import { classes } from "./styles";

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
    if (props.items.some((item) => item.testId === activeTestId)) return;
    setActiveTestId(props.items[0]?.testId ?? "");
  }, [activeTestId, props.items]);

  if (props.items.length === 0) return null;

  const inline = props.placement === "inline";

  const content = <>
        {!inline && (
          <div className="flex items-center justify-between gap-related">
            <span className={contentPresentation.caption}>Inspector</span>
            <Command label="Close inspector" onClick={() => setOpen(false)}><X aria-hidden="true" size={16} /></Command>
          </div>
        )}

        <Tabs
          className="flex min-w-0 flex-wrap gap-related"
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
  </>;
  if (!inline) return <Popover label={label} trigger={label} open={open} onOpenChange={setOpen}
    className={props.className}
    panelClassName="fixed top-auto left-auto bottom-4 right-4 z-50 grid min-w-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-related max-h-[calc(100vh-2rem)] w-[min(42rem,calc(100vw-2rem))] overflow-hidden p-group">
    {content}
  </Popover>;
  return <div className={classes("grid min-w-0 gap-related", props.className)} data-inspector>
    <DisclosureButton expanded={open} controls={panelId} onClick={() => setOpen(current => !current)}>{label}</DisclosureButton>
    <div id={panelId} hidden={!open} className={open ? "grid min-w-0 gap-related" : undefined}>{content}</div>
  </div>;
}
