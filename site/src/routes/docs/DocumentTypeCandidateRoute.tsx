import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { MarkdownViewer } from "./MarkdownViewer";

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
  const source = `## 후보 상태

${name}은 현재 Document Type 후보입니다. 기존 package와 Hands에서 실제 책임을
옮기거나 완료를 선언하지 않았습니다.

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
