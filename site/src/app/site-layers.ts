import { type SiteNavigationGroup } from "./page-descriptors";

export type SiteLayer = {
  readonly group: SiteNavigationGroup;
  readonly path: string;
  readonly label: string;
  readonly blurb: string;
  readonly separated?: boolean;
};

export const siteLayers: ReadonlyArray<SiteLayer> = [
  { group: "JSON Document", path: "/docs", label: "JSON Document", blurb: "Values and changes" },
  { group: "Editing", path: "/docs/intent-guide", label: "Editing", blurb: "Selection and work" },
  { group: "Adapter", path: "/docs/adapters", label: "Adapter", blurb: "Platform contracts" },
  { group: "Connector", path: "/docs/connectors", label: "Connector", blurb: "Library ecosystems" },
  { group: "Affordance", path: "/docs/affordance", label: "Affordance", blurb: "Keyboard, mouse, and cursor" },
  { group: "Hands", path: "/editors", label: "Hands", blurb: "Tools for people" },
  { group: "Artifact", path: "/viewer", label: "Artifact", blurb: "The complete experience" },
  {
    group: "Collaboration",
    path: "/docs/collaboration",
    label: "Collaboration",
    blurb: "The same contract, other implementation",
    separated: true,
  },
];

export const siteLayerGroups: ReadonlyArray<SiteNavigationGroup> = siteLayers.map((layer) => layer.group);
