import documentTypeAudits from "../../../audits/document-types.json";
import { pageDescriptors, type SiteNavigationGroup, type SiteRoute } from "./page-descriptors";
import { groupLandings, siteSections } from "./site-layers";

/** Site-owned documentation relationships; package behavior stays at its owner. */
export function modulePositions(page: SiteRoute): readonly SiteNavigationGroup[] {
  return page.module && page.navigationGroup ? [page.navigationGroup, ...page.module.alsoIn] : [];
}

export function modulesAt(groups: readonly SiteNavigationGroup[], pages: readonly SiteRoute[] = pageDescriptors): readonly SiteRoute[] {
  return pages.filter(page => modulePositions(page).some(group => groups.includes(group)));
}



function link(page: SiteRoute): string { return `[${(page.module ? page.label : page.relatedDemoLabel ?? page.heading ?? page.label).replace(/^API · /, "")}](${page.path})`; }
function links(paths: readonly string[], pages: readonly SiteRoute[]): string {
  return paths.map(path => { const page = pages.find(page => page.path === path); if (!page) throw new Error(`Unknown documentation relation: ${path}`); return link(page); }).join(" · ");
}
function consumers(page: SiteRoute, pages: readonly SiteRoute[]): readonly string[] {
  return pages.filter(candidate => candidate.modulePaths?.includes(page.path)).map(candidate => candidate.path);
}
function table(modules: readonly SiteRoute[], pages: readonly SiteRoute[]): string {
  return `| 공개 API | 책임 | Usage |\n| --- | --- | --- |\n${modules.map(page => `| ${link(page)} | ${page.module!.responsibility} | ${links(page.module!.usagePaths, pages)} |`).join("\n")}`;
}

/** Render through DocumentationPage's existing Markdown surface, including its heading navigation. */
export function documentationMap(page: SiteRoute, pages: readonly SiteRoute[] = pageDescriptors): string {
  if (page.module) {
    const module = page.module;
    const positions = modulePositions(page).map(group => `[${group}](${groupLandings[group].path})`).join(" · ");
    const apps = consumers(page, pages);
    return `## 책임과 사용 경로\n\n${module.responsibility}\n\n- 위치: ${positions}\n- 구현 위치: \`${module.sourceDirectory}\`\n- Usage · Source: ${links(module.usagePaths, pages)}\n${apps.length ? `- 확인된 제품 조합: ${links(apps, pages)}\n` : ""}\n${module.statusNote ?? ""}\n`;
  }
  if (page.path === "/docs/architecture") {
    const sections = siteSections.filter(section => section.groups.some(group => modulesAt([group], pages).length));
    return `## 현재 저장소의 책임 지도\n\n${pages.filter(page => page.module).length}개 패키지의 공개 계약을 책임별로 연결합니다. 복수 책임 패키지는 관련 위치에 함께 나타납니다. 이 지도는 직렬 의존 그래프나 완료 판정이 아닙니다. Usage에서 실제 동작과 정본 Source를 확인하세요.\n\n${sections.map(section => `## ${section.label} · 현재 모듈\n\n${section.groups.map(group => {
      const modules = modulesAt([group], pages);
      return modules.length ? `### ${group}\n\n${table(modules, pages)}` : "";
    }).filter(Boolean).join("\n\n")}`).join("\n\n")}\n\n${applicationMap(pages)}`;
  }
  if (page.path === "/applications") return applicationMap(pages);
  const section = siteSections.find(section => section.path === page.path && section.id === "modules");
  const group = Object.entries(groupLandings).find(([, landing]) => landing.path === page.path)?.[0] as SiteNavigationGroup | undefined;
  if (section?.id === "modules") {
    return section.groups.map(group => `## ${group}\n\n[설명](${groupLandings[group].path})\n\n${table(modulesAt([group], pages), pages)}`).join("\n\n");
  }
  const groups = section?.groups ?? (group ? [group] : []);
  const modules = modulesAt(groups, pages);
  const candidates = ["/docs/document-types", "/docs/ownership"].includes(page.path) ? documentTypeMap(pages) : "";
  return modules.length ? `## 현재 제공 모듈\n\n역할별 공개 계약과 실제 Usage입니다. 패키지 내부의 혼합 책임과 이행 상태는 각 API 문서에서 확인합니다.\n\n${table(modules, pages)}\n\n${candidates}` : candidates;
}

function applicationMap(pages: readonly SiteRoute[]): string {
  return `## 제품에서 모듈로\n\n제품 route의 정적 import 경로에서 확인되는 대표 정본 모듈을 연결합니다. type import와 re-export를 포함하며 실행 시 호출을 보장하지 않습니다. 아래는 확인한 대표 조합이며 전체 의존성 목록이 아닙니다. 제품의 존재가 모든 Profile의 완료를 뜻하지 않습니다.\n\n| Application | 확인된 모듈 조합 |\n| --- | --- |\n${pages.filter(page => page.modulePaths).map(page => `| ${link(page)} | ${links(page.modulePaths!, pages)} |`).join("\n")}`;
}

function documentTypeMap(pages: readonly SiteRoute[]): string {
  return `## 현재 후보별 상태

소유권 확정은 전체 Profile 또는 wire Stable의 완료와 다릅니다. 각 문서에서 목표와 현재 구현의 차이 및 감사 증거를 확인합니다.

| Document Type | 소유권 상태 |
| --- | --- |
${documentTypeAudits.candidates.map(candidate => {
    const page = pages.find(page => page.path === `/docs/document-types/${candidate}`)!;
    const audit = documentTypeAudits.audits[candidate as keyof typeof documentTypeAudits.audits];
    return `| [${page.label.replace(/ · (?:TBD|RC).*$/, "")}](${page.path}) | ${audit?.status === "owner-closed" ? "소유권 확정 · RC" : "후보 · TBD"} |`;
  }).join("\n")}`;
}
