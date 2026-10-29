import { applyUIBuilderMaterials, createUIBuilderEditor, readUIBuilderProject, type UIBuilderField, type DatabaseRecord } from "@interactive-os/json-document-editing";

export const builderDomainExamples = ["support", "inventory"] as const;
export type BuilderDomainExample = typeof builderDomainExamples[number];
const field = (id: string, name: string, type: UIBuilderField["type"] = "text", options: UIBuilderField["options"] = []): UIBuilderField => ({id, name, type, options, sample: "auto"});
/** Synthetic domain fixtures only. The agent composes screens using canonical builder tools. */
export function createBuilderDomainExample(domain: BuilderDomainExample) {
  const editor = createUIBuilderEditor({profile: "canvas/1", width: 1200, height: 1200, objects: []});
  const support = domain === "support";
  const fields = support ? [field("title", "문의 제목", "title"), field("customer", "고객"), field("state", "처리 상태", "select", [{id: "new", name: "접수"}, {id: "working", name: "처리 중"}, {id: "done", name: "해결"}]), field("priority", "우선순위", "select", [{id: "high", name: "높음"}, {id: "normal", name: "보통"}]), field("body", "문의 내용"), field("reply", "답변 초안")]
    : [field("title", "상품명", "title"), field("sku", "상품 코드"), field("category", "분류", "select", [{id: "office", name: "사무용품"}, {id: "device", name: "주변기기"}]), field("stock", "재고 수량", "number"), field("price", "단가 (원)", "number"), field("note", "입고 메모")];
  const rows: readonly DatabaseRecord[] = support ? [
    {id: "support-1", values: {title: "결제 후 주문이 보이지 않습니다", customer: "고객 A", state: "new", priority: "high", body: "결제 완료 안내는 받았지만 주문 목록이 비어 있습니다. 같은 결제가 반복되지 않도록 확인 부탁드립니다.", reply: ""}},
    {id: "support-2", values: {title: "배송 주소 변경 요청 — 수령인과 상세 주소를 함께 수정하고 싶습니다", customer: "고객 B", state: "working", priority: "normal", body: "출고 전 주문입니다. 변경 가능 여부와 필요한 정보를 알려주세요.", reply: "출고 상태를 먼저 확인한 뒤 변경 가능 여부를 안내하겠습니다."}},
    {id: "support-3", values: {title: "영수증 다운로드 방법", customer: "고객 C", state: "done", priority: "normal", body: "영수증을 받을 수 있는 메뉴를 찾고 있습니다.", reply: "주문 상세의 영수증 버튼에서 내려받을 수 있습니다. (MOCK 답변)"}},
  ] : [
    {id: "product-1", values: {title: "무선 키보드", sku: "KB-001", category: "device", stock: 0, price: 59000, note: "품절. 다음 입고일은 미정입니다."}},
    {id: "product-2", values: {title: "재활용 노트 A5 — 무지 · 80매 · 3권 묶음", sku: "NT-203", category: "office", stock: 7, price: 12000, note: "소량 재고. 담당자가 입고 계획을 확인해야 합니다."}},
    {id: "product-3", values: {title: "USB-C 허브", sku: "HB-105", category: "device", stock: 128, price: 39000, note: ""}},
  ];
  const result = applyUIBuilderMaterials(editor, [{type: "table.save", id: domain, name: support ? "고객 문의" : "상품 재고", fields}]);
  if (!result.ok) throw new Error("도메인 MOCK 스키마를 만들지 못했습니다.");
  const table = readUIBuilderProject(editor.snapshot.value).tables[0]!;
  const data = applyUIBuilderMaterials(editor, [{type: "table.data", id: domain, data: {...table.data, records: rows}}]);
  if (!data.ok) throw new Error("도메인 MOCK 데이터를 만들지 못했습니다.");
  return createUIBuilderEditor(readUIBuilderProject(editor.snapshot.value));
}
