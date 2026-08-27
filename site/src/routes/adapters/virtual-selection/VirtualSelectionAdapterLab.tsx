import { useMemo } from "react";
import { useVirtualSelectionScope } from "@interactive-os/json-document-react";
import { classes, ui } from "../../../shared/ui/styles";

export function VirtualSelectionAdapterLab() {
  const rows = useMemo(() => Array.from({ length: 5_000 }, (_, index) => `Model row ${String(index + 1).padStart(4, "0")} — content outside the mounted window remains copyable.`), []);
  const allText = useMemo(() => rows.join("\n"), [rows]);
  const transcriptRef = useVirtualSelectionScope({ activation: "fallback", readAllText: () => allText });
  const codeRef = useVirtualSelectionScope({ activation: "contained", readAllText: () => "nested code model\nsecond logical line" });

  return (
    <section ref={transcriptRef} className={classes("grid gap-4 p-4", ui.surface.raised)} data-testid="virtual-selection-surface">
      <header>
        <h2 className={classes("m-0", ui.text.heading)}>5,000 logical rows · 2 mounted rows</h2>
        <p className={classes("mb-0 mt-2", ui.text.meta)}>Use Cmd/Ctrl+A, then copy. The native highlight covers this mounted window while the clipboard receives every model row.</p>
      </header>
      <div className={classes("grid gap-2 p-3", ui.surface.workspace)}>
        <p className="m-0" data-row-index="0">{rows[0]}</p>
        <div aria-hidden="true" className={ui.text.meta}>4,998 virtual rows are not mounted</div>
        <p className="m-0" data-row-index="4999">{rows.at(-1)}</p>
      </div>
      <pre ref={codeRef} className={classes("m-0 overflow-auto p-3", ui.surface.workspace)} data-testid="virtual-selection-contained">nested code mounted</pre>
      <output className={ui.text.meta} data-testid="virtual-selection-model-size">{allText.length.toLocaleString()} model characters</output>
    </section>
  );
}
