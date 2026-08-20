import { type SiteNavigationGroup } from "./page-descriptors";

export type SiteLayer = {
  readonly group: SiteNavigationGroup;
  readonly path: string;
  readonly label: string;
  readonly blurb: string;
};

export const siteLayers: ReadonlyArray<SiteLayer> = [
  { group: "JSON Document", path: "/docs", label: "JSON Document", blurb: "Values and changes" },
  { group: "Collaboration", path: "/docs/collaboration", label: "Collaboration", blurb: "The same contract, other implementation" },
  { group: "Editing", path: "/docs/intent-guide", label: "Editing", blurb: "Selection and work" },
  { group: "Hands", path: "/editors", label: "Hands", blurb: "Genre hands" },
  { group: "Adapter", path: "/adapters", label: "Adapter", blurb: "Platform contracts" },
  { group: "Connector", path: "/connectors", label: "Connector", blurb: "Library ecosystems" },
  { group: "Affordance", path: "/docs/affordance", label: "Affordance", blurb: "Keyboard, mouse, and cursor" },
];

export const siteLayerGroups: ReadonlyArray<SiteNavigationGroup> = siteLayers.map((layer) => layer.group);
