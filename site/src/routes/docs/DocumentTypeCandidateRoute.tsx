import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { MarkdownViewer } from "./MarkdownViewer";
import documentTypeAudits from "../../../../audits/document-types.json";

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
  const audit = props.candidate === "calendar" ? documentTypeAudits.audits.calendar : undefined;
  const auditSource = audit === undefined ? "" : `
## 소스 기반 감사 현황

- 상태: **감사됨 · TBD**
- 감사 분모: **${audit.denominator}개 책임 occurrence**
- 정본 소비/Host composition: **${audit.occurrences.filter((item) => item.disposition === "canonical consumer" || item.disposition === "Host composition").length}개**
- canonical move 필요: **${audit.occurrences.filter((item) => item.disposition !== "canonical consumer" && item.disposition !== "Host composition").length}개**

| 책임 | 현재 owner | 판정 | 다음 확인 |
| --- | --- | --- | --- |
${audit.occurrences.map((item) => `| ${item.role} | \`${item.currentOwner}\` | ${item.disposition} | ${item.nextCheck} |`).join("\n")}

감사 분모는 \`${audit.horizon.enumerators.join("`, `")}\`에서 출발하며,
fixture, copy, layout-only CSS, tests와 generated route는 제외합니다.
`;
  const source = `## 후보 상태

${name}은 현재 Document Type 후보입니다. 기존 package와 Hands에서 실제 책임을
옮기거나 완료를 선언하지 않았습니다.

## 왜 필요한가

${profile.why}

## 무엇을 하는가

${profile.does}

## 현재 관찰된 schema · TBD

이 schema는 현재 source에 존재하는 document interface를 축약한 감사 입력입니다.
정본 owner와 schema 계약이 확정됐다는 뜻은 아닙니다.

\`\`\`ts
${profile.schema}
\`\`\`

근거: \`${profile.sourcePath}\`의 \`${profile.symbol}\`
${auditSource}

## 확정에 필요한 증거

1. model, invariant, Document Operation과 Projection의 canonical owner
2. owner package의 안정적인 public API와 API reference
3. 공개 API를 직접 사용하는 site Usage와 source registration
4. 같은 책임을 구현하는 Host 또는 Demo local bypass가 없다는 감사 결과

증거가 닫히기 전에는 이 페이지와 내비게이션을 \`${name} · TBD\`로 유지합니다.
`;

  return (
    <PageFrame>
      <PageHeader title={`${name} Document Type · TBD`} illustration="braces">
        후보의 이름만 등록했으며 소유권과 구현 경계는 아직 확정하지 않았습니다.
      </PageHeader>
      <div className="mx-auto max-w-3xl">
        <MarkdownViewer source={source} />
      </div>
    </PageFrame>
  );
}
