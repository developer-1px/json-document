import { type SiteNavigationGroup } from "./page-descriptors";

export type SiteSection = {
  readonly id: "introduction" | "foundation" | "building-blocks" | "hands" | "artifact" | "applications";
  readonly path: string;
  readonly label: string;
  readonly blurb: string;
  readonly groups: ReadonlyArray<SiteNavigationGroup>;
};

export const siteSections: ReadonlyArray<SiteSection> = [
  {
    id: "introduction",
    path: "/docs",
    label: "Introduction",
    blurb: "Why, concepts, and how we build",
    groups: ["Introduction"],
  },
  {
    id: "foundation",
    path: "/docs/foundation",
    label: "Foundation",
    blurb: "Values, meaning, editing, and collaboration",
    groups: ["JSON Document", "Document Types", "Editing", "Collaboration"],
  },
  {
    id: "building-blocks",
    path: "/docs/building-blocks",
    label: "Building Blocks",
    blurb: "Platform, ecosystem, interaction, and UI",
    groups: ["Adapter", "Connector", "Affordance", "UI Primitives"],
  },
  {
    id: "hands",
    path: "/editors",
    label: "Hands",
    blurb: "Tools that close an editing loop",
    groups: ["Hands"],
  },
  {
    id: "artifact",
    path: "/viewer",
    label: "Artifact",
    blurb: "Editable content inside applications",
    groups: ["Artifact"],
  },
  {
    id: "applications",
    path: "/applications",
    label: "Applications",
    blurb: "Products that reveal reusable modules",
    groups: ["Applications"],
  },
];

export type SiteSectionId = (typeof siteSections)[number]["id"];

export function sectionForGroup(group: SiteNavigationGroup): SiteSection {
  const section = siteSections.find((candidate) => candidate.groups.includes(group));
  if (section === undefined) throw new Error(`Site navigation group has no section: ${group}`);
  return section;
}

export const groupLandings: Record<SiteNavigationGroup, { readonly path: string; readonly label: string }> = {
  Introduction: { path: "/docs", label: "Introduction" },
  "JSON Document": { path: "/docs/api", label: "JSON Document" },
  "Document Types": { path: "/docs/document-types", label: "Document Types" },
  Editing: { path: "/docs/editing", label: "Editing" },
  Collaboration: { path: "/docs/collaboration", label: "Collaboration" },
  Adapter: { path: "/docs/adapters", label: "Adapter" },
  Connector: { path: "/docs/connectors", label: "Connector" },
  Affordance: { path: "/docs/affordance", label: "Affordance" },
  "UI Primitives": { path: "/docs/ui-primitives", label: "UI Primitives" },
  Hands: { path: "/editors", label: "Hands" },
  Artifact: { path: "/viewer", label: "Artifact" },
  Applications: { path: "/applications", label: "Applications" },
};
