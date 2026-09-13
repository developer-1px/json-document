import { type SiteNavigationGroup } from "./page-descriptors";

export type SiteSection = {
  readonly id: "getting-started" | "modules" | "hands" | "applications" | "design";
  readonly path: string;
  readonly label: string;
  readonly blurb: string;
  readonly groups: ReadonlyArray<SiteNavigationGroup>;
};

export const siteSections: ReadonlyArray<SiteSection> = [
  { id: "getting-started", path: "/docs", label: "시작하기", blurb: "소개, 빠른 시작과 아키텍처", groups: ["Introduction"] },
  { id: "modules", path: "/docs/modules", label: "모듈", blurb: "책임별 설명, API와 Usage", groups: ["JSON Document", "Document Types", "Editing", "Collaboration", "Adapter", "Connector", "Affordance", "UI Primitives"] },
  { id: "hands", path: "/editors", label: "편집 조합 · Hands", blurb: "장르별 편집 예제와 지원 범위", groups: ["Hands"] },
  { id: "applications", path: "/applications", label: "Applications", blurb: "Bear, Calendar와 AI Agent", groups: ["Applications"] },
  { id: "design", path: "/docs/design", label: "설계와 진행 상태", blurb: "설계 목표, 프로토타입과 소유권 감사", groups: ["Design", "Artifact"] },
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
  Artifact: { path: "/docs/design", label: "설계와 진행 상태" },
  Design: { path: "/docs/design", label: "설계와 진행 상태" },
  Applications: { path: "/applications", label: "Applications" },
};
