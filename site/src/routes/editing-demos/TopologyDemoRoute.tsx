import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { Inspector } from "../../shared/ui/inspector";
import { Choice, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader } from "../../shared/ui/primitives";
import { classes } from "../../shared/ui/styles";
import { editingItemProps } from "@interactive-os/json-document-react";
import { topologyLabOrders, topologyLabRecords, useTopologyLab } from "./useTopologyLab";

export function TopologyDemoRoute() {
  const { anchor, editing, focus, interval, order, setOrder, topology } = useTopologyLab();

  return (
    <DemoPage documentation={(
      <PageHeader title="Topology Demo" illustration="cursor">
        anchor와 focus를 유지한 채 화면 순서를 바꾸고, 그 순서에서 계산된 범위를 확인합니다.
      </PageHeader>

    )}>
      <div className="grid gap-group lg:grid-cols-3">
        <section className={classes("grid content-start gap-group p-group")} aria-labelledby="topology-input">
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>1 · 입력</p>
          <h2 id="topology-input" className={contentPresentation.itemTitle}>화면 순서 선택하기</h2></div>
          <Choice presentation="inline" label="Visible order" value={order} options={(Object.keys(topologyLabOrders) as ReadonlyArray<keyof typeof topologyLabOrders>).map((item) => ({ id: item, label: item }))} onValueChange={setOrder} />
          <ol className="m-0 grid list-none gap-related p-0">
            {topology.ids.map((id) => {
              const item = editing.getItem(id);
              return (
                <li key={id}>
                  <SelectableItem presentation="row"
                    type="button"
                    className={classes("w-full px-related py-related", contentPresentation.itemSummary)}
                    {...editingItemProps(item)}
                  >
                    {topologyLabRecords[id as keyof typeof topologyLabRecords]}
                  </SelectableItem>
                </li>
              );
            })}
          </ol>
        </section>

        <section className={classes("grid content-start gap-group p-group")} aria-labelledby="topology-call">
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>2 · API 호출</p>
          <h2 id="topology-call" className={contentPresentation.itemTitle}>lineInterval(topology, anchor, focus)</h2></div>
          <Inspector label="Inspect topology input" items={[
            { label: "topology", value: topology, testId: "topology-demo-topology", size: "compact" },
            {
              label: "endpoints",
              value: { anchor, focus },
              testId: "topology-demo-endpoints",
              size: "compact",
            },
          ]} />
        </section>

        <section className={classes("grid content-start gap-group p-group")} aria-labelledby="topology-result">
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>3 · 결과</p>
          <h2 id="topology-result" className={contentPresentation.itemTitle}>범위는 화면 순서를 따릅니다</h2></div>
          <Inspector label="Inspect interval" items={[
            { label: "interval", value: interval, testId: "topology-demo-interval", size: "compact" },
          ]} />
          <p className={classes("mb-0 ", contentPresentation.caption)}>
            양 끝점은 그대로입니다. 화면이 넘긴 Topology가 그 사이에 놓일 항목을 결정합니다.
          </p>
        </section>
      </div>
    </DemoPage>
  );
}
