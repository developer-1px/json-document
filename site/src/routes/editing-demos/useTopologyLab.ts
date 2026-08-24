import { useMemo, useState } from "react";
import { lineInterval, lineTopology } from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";

export const topologyLabRecords = {
  alpha: "Alpha",
  bravo: "Bravo",
  charlie: "Charlie",
  delta: "Delta",
} as const;

export const topologyLabOrders = {
  source: ["alpha", "bravo", "charlie", "delta"],
  sorted: ["alpha", "delta", "charlie", "bravo"],
  filtered: ["alpha", "charlie", "delta"],
} as const;

/** Owns the Topology page's educational order and endpoint state. */
export function useTopologyLab() {
  const [order, setOrder] = useState<keyof typeof topologyLabOrders>("source");
  const [anchor, setAnchor] = useState("alpha");
  const [focus, setFocus] = useState("charlie");
  const topology = useMemo(() => lineTopology(topologyLabOrders[order]), [order]);
  const interval = lineInterval(topology, anchor, focus);
  const editing = useEditing({
    selectedKeys: interval,
    focusKey: focus,
    onSelect: (key, mode) => {
      if (mode === "extend") setFocus(key);
      else { setAnchor(key); setFocus(key); }
    },
  });
  return { anchor, editing, focus, interval, order, setOrder, topology };
}
