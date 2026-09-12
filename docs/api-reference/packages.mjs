import { readFileSync } from "node:fs";

const siteRoutes = JSON.parse(readFileSync(new URL("../../site/site-routes.json", import.meta.url), "utf8"));

export const apiReferencePackages = [
  ["markdown", "@interactive-os/json-document-markdown", "packages/json-document-markdown/src/index.ts", "원문 문자열이 정본인 Markdown 문법과 source 위치 projection"],
  ["markdown-web", "@interactive-os/json-document-markdown-web", "packages/json-document-markdown-web/src/index.ts", "Markdown source 위치와 caret에 따른 DOM projection"],
  ["object-document", "@interactive-os/json-document-object-document", "packages/json-document-object-document/src/index.ts", "Object 문서와 Canvas 프로파일의 모델·검증·연산·projection"],
  ["canvas", "@interactive-os/json-document-canvas", "packages/json-document-canvas/src/index.ts", "한 장짜리 Canvas의 입력·preview·UI 조합"],
  ["calendar-document", "@interactive-os/json-document-calendar-document", "packages/json-document-calendar-document/src/index.ts", "Calendar 문서 모델·검증·의미 연산·projection 계약"],
  ["a2ui", "@interactive-os/json-document-a2ui", "packages/json-document-a2ui/src/index.ts", "A2UI streaming document connector"],
  ["json-document", "@interactive-os/json-document", "packages/json-document/src/application/document/index.ts", "Core document 값·주소·patch 계약"],
  ["selection", "@interactive-os/json-document-selection", "packages/json-document-selection/src/index.ts", "구조적 selection과 topology 계약"],
  ["editing", "@interactive-os/json-document-editing", "packages/json-document-editing/src/index.ts", "intent, editor, history 편집 계약"],
  ["react", "@interactive-os/json-document-react", "packages/json-document-react/src/index.ts", "React lifecycle connector"],
  ["react-hook-form", "@interactive-os/json-document-react-hook-form", "packages/json-document-react-hook-form/src/index.ts", "React Hook Form connector"],
  ["ajv", "@interactive-os/json-document-ajv", "packages/json-document-ajv/src/index.ts", "Ajv validation connector"],
  ["zod", "@interactive-os/json-document-zod", "packages/json-document-zod/src/index.ts", "Zod schema connector"],
  ["tanstack-table", "@interactive-os/json-document-tanstack-table", "packages/json-document-tanstack-table/src/index.ts", "TanStack Table connector"],
  ["affordance", "@interactive-os/json-document-affordance", "packages/json-document-affordance/src/index.ts", "입력 문법과 interaction session"],
  ["ui-primitives-react", "@interactive-os/json-document-ui-primitives-react", "packages/json-document-ui-primitives-react/src/index.ts", "표준 React UI primitive"],
  ["animation-react", "@interactive-os/json-document-animation-react", "packages/json-document-animation-react/src/index.ts", "생성 대기 시각 언어"],
  ["markdown-react", "@interactive-os/json-document-markdown-react", "packages/json-document-markdown-react/src/index.ts", "스트리밍 Markdown 투영과 렌더링"],
  ["database", "@interactive-os/json-document-database", "packages/json-document-database/src/index.ts", "Database 문서 모델·연산·saved-view projection"],
  ["annotation", "@interactive-os/json-document-annotation", "packages/json-document-annotation/src/index.ts", "Annotation interaction과 SVG projection"],
  ["calendar", "@interactive-os/json-document-calendar", "packages/json-document-calendar/src/index.ts", "Calendar React lifecycle와 occurrence interaction 계약 ([시간·반복·거절 계약: Editing의 Calendar protocol profile](/docs/api/editing#calendar-protocol-profile-rc))"],
  ["web", "@interactive-os/json-document-web", "packages/json-document-web/src/index.ts", "Web platform adapter"],
  ["contenteditable", "@interactive-os/json-document-contenteditable", "packages/json-document-contenteditable/src/index.ts", "contenteditable platform adapter"],
  ["rich-text", "@interactive-os/json-document-rich-text", "packages/json-document-rich-text/src/index.ts", "Rich Text 문서 의미와 editing 계약"],
  ["file-intake", "@interactive-os/json-document-file-intake", "packages/json-document-file-intake/src/index.ts", "플랫폼 독립 파일 후보와 수용 정책"],
  ["rich-text-suggestion", "@interactive-os/json-document-rich-text-suggestion", "packages/json-document-rich-text-suggestion/src/index.ts", "Rich Text suggestion trigger와 상태 계약"],
  ["rich-text-suggestion-react", "@interactive-os/json-document-rich-text-suggestion-react", "packages/json-document-rich-text-suggestion-react/src/index.ts", "Rich Text suggestion React interaction binding"],
  ["rich-text-mention", "@interactive-os/json-document-rich-text-mention", "packages/json-document-rich-text-mention/src/index.ts", "Rich Text entity mention schema와 삽입 계약"],
  ["rich-text-mention-react", "@interactive-os/json-document-rich-text-mention-react", "packages/json-document-rich-text-mention-react/src/index.tsx", "Rich Text mention React projection"],
  ["composer", "@interactive-os/json-document-composer", "packages/json-document-composer/src/index.ts", "Composer draft와 reference/trigger command 계약"],
  ["composer-react", "@interactive-os/json-document-composer-react", "packages/json-document-composer-react/src/index.ts", "Composer React interaction과 reference projection"],
  ["rich-text-web", "@interactive-os/json-document-rich-text-web", "packages/json-document-rich-text-web/src/index.ts", "Rich Text DOM adapter"],
  ["rich-text-react", "@interactive-os/json-document-rich-text-react", "packages/json-document-rich-text-react/src/index.tsx", "Rich Text React connector"],
  ["collaboration", "@interactive-os/json-document-collaboration", "packages/json-document-collaboration/src/index.ts", "replica, history, text collaboration runtime"],
  ["contenteditable-collaboration", "@interactive-os/json-document-contenteditable-collaboration", "packages/contenteditable-collaboration/src/index.ts", "collaborative contenteditable lease"],
].map(([slug, packageName, entrypoint, responsibility]) => {
  const route = siteRoutes.find(route => route.path === `/docs/api/${slug}`);
  if (!route?.module || !entrypoint.startsWith(`${route.module.sourceDirectory}/`)) throw new Error(`API owner registration missing: ${packageName}`);
  return ({
  slug, packageName, entrypoint, navigationGroup: route.navigationGroup, responsibility,
  subpaths: slug === "collaboration" ? [{
    packageName: "@interactive-os/json-document-collaboration/history",
    entrypoint: "packages/json-document-collaboration/src/history-index.ts",
  }, {
    packageName: "@interactive-os/json-document-collaboration/text",
    entrypoint: "packages/json-document-collaboration/src/text-index.ts",
  }, {
    packageName: "@interactive-os/json-document-collaboration/editing",
    entrypoint: "packages/json-document-collaboration/src/editing-index.ts",
  }] : slug === "web" ? [{
    packageName: "@interactive-os/json-document-web/interaction-recording",
    entrypoint: "packages/json-document-web/src/interaction-recording-index.ts",
  }] : [],
});
});

export function apiReferenceCoverageErrors(manifests, references = apiReferencePackages) {
  const expected = manifests.filter((manifest) => !manifest.private).flatMap((manifest) =>
    Object.entries(manifest.exports).filter(([, target]) => hasTypes(target))
      .map(([subpath]) => subpath === "." ? manifest.name : `${manifest.name}/${subpath.slice(2)}`));
  const registered = references.flatMap(({ packageName, subpaths }) =>
    [packageName, ...subpaths.map((subpath) => subpath.packageName)]);
  return [
    ...expected.filter((name) => !registered.includes(name)).map((name) => `API reference missing: ${name}`),
    ...registered.filter((name) => !expected.includes(name)).map((name) => `API reference is not public: ${name}`),
    ...registered.filter((name, index) => registered.indexOf(name) !== index).map((name) => `Duplicate API reference: ${name}`),
  ];
}

function hasTypes(target) {
  return target !== null && typeof target === "object"
    && (typeof target.types === "string" || Object.values(target).some(hasTypes));
}
