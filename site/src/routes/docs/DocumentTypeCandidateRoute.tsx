import documentTypeAudits from "../../../../audits/document-types.json";
import { DocumentationPage } from "./DocumentationPage";

const candidateNames = {
  "rich-text": "Rich Text",
  order: "Order",
  object: "Object",
  tree: "Tree",
  database: "Database",
  calendar: "Calendar",
  sheet: "Sheet",
  kanban: "Kanban",
  annotation: "Annotation",
} as const;

export type DocumentTypeCandidate = keyof typeof candidateNames;

export function DocumentTypeCandidateRoute(props: { readonly candidate: DocumentTypeCandidate }) {
  const name = candidateNames[props.candidate];
  const profile = documentTypeAudits.candidateProfiles[props.candidate];
  const audit = documentTypeAudits.audits[props.candidate as keyof typeof documentTypeAudits.audits];
  const ownerClosed = audit?.status === "owner-closed";
  const auditSource = audit === undefined ? "" : `
## 소스 기반 감사 현황

- 상태: **${ownerClosed ? "소유권 확정 · RC" : "감사됨 · TBD"}**
- 감사 분모: **${audit.denominator}개 책임 occurrence**
- 정본 소비/Host composition: **${audit.occurrences.filter((item) => item.disposition === "canonical consumer" || item.disposition === "Host composition").length}개**
- canonical move 필요: **${audit.occurrences.filter((item) => item.disposition !== "canonical consumer" && item.disposition !== "Host composition").length}개**

| 책임 | 현재 owner | 판정 | 다음 확인 |
| --- | --- | --- | --- |
${audit.occurrences.map((item) => `| ${item.role} | \`${item.currentOwner}\` | ${item.disposition} | ${item.nextCheck} |`).join("\n")}

감사 분모는 \`${audit.horizon.enumerators.join("`, `")}\`에서 출발하며,
fixture, copy, layout-only CSS, tests와 generated route는 제외합니다.
`;
  const source = `## ${ownerClosed ? "공개 소유자 · RC" : "후보 상태"}

${ownerClosed
  ? `${name}의 모델·검증·의미 연산·projection은 \`${audit.closure.owner}\`가 소유합니다. Editing·Selection·React 없이 소비할 수 있으며 기존 Editing export는 호환 경로로 유지합니다. 소유권 확정은 wire Stable 승격을 뜻하지 않습니다.`
  : `${name}은 현재 Document Type 후보입니다. 기존 package와 Hands에서 실제 책임을 옮기거나 완료를 선언하지 않았습니다.`}

## 왜 필요한가

${profile.why}

## 무엇을 하는가

${profile.does}

## ${ownerClosed ? "현재 RC 모델" : "현재 관찰된 schema · TBD"}

${ownerClosed
  ? `아래는 정본 document interface입니다. 필드 생략의 legacy 호환, 잘못된 타입 거절과 프로파일 의미는 [소유자 API 계약](${audit?.closure.apiPath ?? "/docs/api/calendar-document"})에 명시합니다.`
  : "이 schema는 현재 source에 존재하는 document interface를 축약한 감사 입력입니다. 정본 owner와 schema 계약이 확정됐다는 뜻은 아닙니다."}

\`\`\`ts
${profile.schema}
\`\`\`

근거: \`${profile.sourcePath}\`의 \`${profile.symbol}\`

### 필드 설명

| 항목 | 의미 |
| --- | --- |
${profile.fields.map((field) => `| \`${field.name}\` | ${field.description} |`).join("\n")}
${auditSource}

## ${ownerClosed ? "확정 증거와 남은 범위" : "확정에 필요한 증거"}

1. model, invariant, Document Operation과 Projection의 canonical owner
2. owner package의 안정적인 public API와 API reference
3. 공개 API를 직접 사용하는 site Usage와 source registration
4. 같은 책임을 구현하는 Host 또는 Demo local bypass가 없다는 감사 결과

${ownerClosed
  ? `[공개 API와 값 계약](${audit?.closure.apiPath ?? "/docs/api/calendar-document"}), [${name} Usage 및 Source](${audit.closure.usagePagePath}), 독립 Document Type·Editing·Hand 테스트가 연결돼 있습니다. ${props.candidate === "object" ? "Canvas의 다중 페이지·그룹·레이어·PPTX·협업" : "timezone/DST·서버 동기화·RRULE·pagination"} 및 독립 구현 conformance는 TBD로 남습니다.`
  : `증거가 닫히기 전에는 이 페이지와 내비게이션을 \`${name} · TBD\`로 유지합니다.`}
`;

  return (
    <DocumentationPage
      title={`${name} Document Type · ${ownerClosed ? "RC" : "TBD"}`}
      source={source}
      illustration="braces"
      summary={ownerClosed ? "문서 모델·검증·의미 연산·projection의 공개 소유자와 검증 범위를 설명합니다." : "후보의 이름만 등록했으며 소유권과 구현 경계는 아직 확정하지 않았습니다."}
    />
  );
}
