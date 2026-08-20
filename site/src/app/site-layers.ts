import { type SiteNavigationGroup } from "./page-descriptors";

export type SiteLayer = {
  readonly group: SiteNavigationGroup;
  readonly path: string;
  readonly label: string;
  readonly blurb: string;
};

export const siteLayers: ReadonlyArray<SiteLayer> = [
  { group: "JSON Document", path: "/docs", label: "JSON Document", blurb: "Values and changes" },
  { group: "Editing", path: "/docs/intent-guide", label: "Editing", blurb: "Selection and work" },
  { group: "Editors", path: "/editors", label: "Editors", blurb: "Genre idioms" },
  { group: "Adapters", path: "/adapters", label: "Adapters", blurb: "Platform contracts" },
  { group: "Connectors", path: "/connectors", label: "Connectors", blurb: "Library ecosystems" },
  { group: "Widgets", path: "/widgets", label: "Widgets", blurb: "Editing values as widget props" },
];

export const siteLayerGroups: ReadonlyArray<SiteNavigationGroup> = siteLayers.map((layer) => layer.group);
