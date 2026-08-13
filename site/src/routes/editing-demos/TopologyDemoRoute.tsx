import { useMemo, useState } from "react";
import { lineInterval, lineTopology } from "@interactive-os/json-document-editing";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { ToggleButton } from "../../shared/ui/interactive";
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
        anchor와 focus를 유지한 채 화면 순서를 바꾸고, 그 순서에서 계산된 범위를 확인합니다.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="topology-input">
          <p className={ui.text.label}>1 · 입력</p>
          <h2 id="topology-input" className={classes("mb-2 mt-1", ui.text.heading)}>화면 순서 선택하기</h2>
          <div className="mb-3 flex flex-wrap gap-1" role="group" aria-label="Visible order">
            {(Object.keys(orders) as ReadonlyArray<keyof typeof orders>).map((item) => (
              <ToggleButton
                key={item}
                pressed={order === item}
                className="px-3 py-1.5"
                onClick={() => setOrder(item)}
              >
                {item}
              </ToggleButton>
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
          <p className={ui.text.label}>2 · API 호출</p>
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
          <p className={ui.text.label}>3 · 결과</p>
          <h2 id="topology-result" className={classes("mb-2 mt-1", ui.text.heading)}>범위는 화면 순서를 따릅니다</h2>
          <JsonInspector label="interval" value={interval} testId="topology-demo-interval" size="compact" />
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            양 끝점은 그대로입니다. 화면이 넘긴 Topology가 그 사이에 놓일 항목을 결정합니다.
          </p>
        </section>
      </div>
    </PageFrame>
  );
}
