import { useMemo, useState } from "react";
import { lineInterval, lineTopology } from "@interactive-os/json-document-editing";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const records = {
  alpha: "Alpha",
  bravo: "Bravo",
  charlie: "Charlie",
  delta: "Delta",
} as const;

const orders = {
  source: ["alpha", "bravo", "charlie", "delta"],
  sorted: ["alpha", "delta", "charlie", "bravo"],
  filtered: ["alpha", "charlie", "delta"],
} as const;

export function TopologyDemoRoute() {
  const [order, setOrder] = useState<keyof typeof orders>("source");
  const topology = useMemo(() => lineTopology(orders[order]), [order]);
  const interval = lineInterval(topology, "alpha", "charlie");

  return (
    <PageFrame>
      <PageHeader title="Topology Demo" illustration="cursor">
        Keep the same anchor and focus, change visible order, then observe the range computed from that order.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="topology-input">
          <p className={ui.text.label}>1 · Input</p>
          <h2 id="topology-input" className={classes("mb-2 mt-1", ui.text.heading)}>Choose visible order</h2>
          <div className="mb-3 flex flex-wrap gap-1" role="group" aria-label="Visible order">
            {(Object.keys(orders) as ReadonlyArray<keyof typeof orders>).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={order === item}
                className={classes("px-3 py-1.5", ui.action.toggle)}
                onClick={() => setOrder(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <ol className="m-0 grid list-none gap-1 p-0">
            {topology.ids.map((id) => (
              <li key={id} className={classes("px-3 py-2", ui.surface.inset)}>
                {records[id as keyof typeof records]}
              </li>
            ))}
          </ol>
        </section>

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="topology-call">
          <p className={ui.text.label}>2 · API call</p>
          <h2 id="topology-call" className={classes("mb-2 mt-1", ui.text.heading)}>lineInterval(topology, anchor, focus)</h2>
          <JsonInspector label="topology" value={topology} testId="topology-demo-topology" size="compact" />
          <JsonInspector
            label="endpoints"
            value={{ anchor: "alpha", focus: "charlie" }}
            testId="topology-demo-endpoints"
            size="compact"
          />
        </section>

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="topology-result">
          <p className={ui.text.label}>3 · Result</p>
          <h2 id="topology-result" className={classes("mb-2 mt-1", ui.text.heading)}>Range follows visible order</h2>
          <JsonInspector label="interval" value={interval} testId="topology-demo-interval" size="compact" />
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            The endpoints stay fixed. The host-supplied topology decides which visible records lie between them.
          </p>
        </section>
      </div>
    </PageFrame>
  );
}
