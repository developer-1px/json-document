import { type SiteNavigationGroup } from "./page-descriptors";

export type SiteSection = {
  readonly id: "foundation" | "building-blocks" | "hands" | "artifact" | "applications" | "reference";
  readonly path: string;
  readonly label: string;
  readonly blurb: string;
  readonly groups: ReadonlyArray<SiteNavigationGroup>;
  readonly separated?: boolean;
};

export const siteSections: ReadonlyArray<SiteSection> = [
  {
    id: "foundation",
    path: "/docs",
    label: "Foundation",
    blurb: "Values, meaning, editing, and collaboration",
    groups: ["JSON Document", "Document Types", "Editing", "Collaboration"],
  },
  {
    id: "building-blocks",
    path: "/docs/adapters",
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
    blurb: "Work people and agents can continue",
    groups: ["Artifact"],
  },
  {
    id: "applications",
    path: "/applications",
    label: "Applications",
    blurb: "Products that reveal reusable modules",
    groups: ["Applications"],
  },
  {
    id: "reference",
    path: "/docs/api",
    label: "Reference",
    blurb: "Canonical package and API indexes",
    groups: [],
    separated: true,
  },
];

export type SiteSectionId = (typeof siteSections)[number]["id"];

export function sectionForGroup(group: SiteNavigationGroup): SiteSection {
  const section = siteSections.find((candidate) => candidate.groups.includes(group));
  if (section === undefined) throw new Error(`Site navigation group has no section: ${group}`);
  return section;
}
