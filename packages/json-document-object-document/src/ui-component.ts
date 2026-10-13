import type { JSONValue } from "@interactive-os/json-document";
import type { CanvasDocument, CanvasObject, CanvasObjectDraft, ObjectDraft, ObjectBounds } from "./object-model.js";
import { assertUIComponentBindings, type UIComponentBinding, type UIBindingTarget } from "./ui-binding.js";
import { assertCanvasDocument } from "./object-validation.js";

/** Closed component vocabulary. Rendering is owned by Canvas, never supplied as code. */
export const uiComponentCatalog = [
  { id: "heading", bindingTargets: ["text"], label: "제목", width: 440, height: 64, text: "새로운 아이디어", detail: "", items: [], description: "Page or section heading" },
  { id: "text", bindingTargets: ["text"], label: "본문", width: 440, height: 80, text: "전하고 싶은 이야기를 적어보세요.", detail: "", items: [], description: "Paragraph or supporting copy" },
  { id: "button", bindingTargets: ["text"], label: "버튼", width: 160, height: 48, text: "시작하기", detail: "", items: [], description: "Primary or secondary call to action" },
  { id: "input", bindingTargets: ["text", "value"], label: "입력", width: 320, height: 84, text: "이메일", detail: "you@example.com", items: [], description: "Labelled single-line input; detail is placeholder" },
  { id: "textarea", bindingTargets: ["text", "value"], label: "긴 입력", width: 320, height: 152, text: "메시지", detail: "내용을 입력하세요", items: [], description: "Labelled multiline input; detail is placeholder" },
  { id: "checkbox", bindingTargets: ["text", "value"], label: "체크박스", width: 300, height: 44, text: "소식을 받아볼게요", detail: "", items: [], description: "Boolean choice with a label" },
  { id: "select", bindingTargets: ["text", "items", "value"], label: "선택 목록", width: 280, height: 84, text: "카테고리", detail: "", items: ["전체", "디자인", "개발"], description: "Labelled selection among items" },
  { id: "tabs", bindingTargets: ["items"], label: "탭", width: 360, height: 48, text: "메뉴", detail: "", items: ["소개", "프로젝트", "연락처"], description: "Navigation tabs from items" },
  { id: "card", bindingTargets: ["text", "detail"], label: "카드", width: 300, height: 180, text: "작은 시작, 큰 가능성", detail: "아이디어를 함께 발전시켜보세요.", items: [], description: "Independent content card with heading and description" },
  { id: "metric", bindingTargets: ["text", "detail"], label: "숫자", width: 220, height: 132, text: "진행 중인 프로젝트", detail: "12", items: [], description: "Metric label and large value in detail" },
  { id: "list", bindingTargets: ["text", "items"], label: "목록", width: 320, height: 200, text: "할 일", detail: "", items: ["아이디어 정리", "첫 화면 만들기", "함께 확인하기"], description: "Titled list of items" },
  { id: "divider", bindingTargets: [], label: "구분선", width: 440, height: 24, text: "구분선", detail: "", items: [], description: "Horizontal section boundary" },
] as const;
export type UIComponentKind = typeof uiComponentCatalog[number]["id"];
export type UIComponentContent = Record<string, JSONValue> & {
  readonly bindings?: readonly UIComponentBinding[];
  readonly actionId?: string;
  readonly value?: string | number | boolean;
  readonly component: UIComponentKind;
  readonly detail: string;
  readonly items: readonly string[];
  readonly tone: "default" | "accent" | "quiet";
}
export const uiComponentDocumentType = "ui-component/1";
export interface UIComponentObject extends ObjectDraft { readonly id: string; readonly kind: "embedded-document"; readonly documentType: string; readonly document: UIComponentContent; }

export function assertUIComponentContent(value: unknown): asserts value is UIComponentContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Invalid component content.");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(key => !["component", "detail", "items", "tone", "bindings", "actionId", "value"].includes(key))
    || !uiComponentCatalog.some(item => item.id === v.component)
    || typeof v.detail !== "string" || v.detail.length > 10000
    || !Array.isArray(v.items) || v.items.length > 50 || v.items.some(item => typeof item !== "string" || item.length > 1000)
    || !["default", "accent", "quiet"].includes(v.tone as string)) throw new TypeError("Unknown component or invalid properties.");
  if (v.bindings !== undefined) assertUIComponentBindings(v.bindings, uiComponentCatalog.find(item => item.id === v.component)!.bindingTargets as readonly UIBindingTarget[]);
  if (v.actionId !== undefined && (v.component !== "button" || typeof v.actionId !== "string" || !v.actionId)) throw new TypeError("액션은 버튼에 연결할 수 있습니다.");
  if (v.value !== undefined && !["string", "number", "boolean"].includes(typeof v.value)) throw new TypeError("입력 값을 확인해 주세요.");
}
export function createUIComponentObject(component: UIComponentKind, position: Pick<ObjectBounds, "x" | "y">, content: Partial<Pick<UIComponentContent, "detail" | "items" | "tone">> & { readonly text?: string } = {}): CanvasObjectDraft {
  const entry = uiComponentCatalog.find(item => item.id === component);
  if (!entry) throw new TypeError("Unknown component.");
  const document = { component, detail: content.detail ?? entry.detail, items: [...(content.items ?? entry.items)], tone: content.tone ?? (component === "button" ? "accent" : "default") };
  assertUIComponentContent(document);
  return { kind: "embedded-document", documentType: uiComponentDocumentType, document, x: position.x, y: position.y,
    width: entry.width, height: entry.height, label: content.text ?? entry.text, color: "transparent" };
}
export function assertUIBuilderDocument(value: unknown): asserts value is CanvasDocument {
  assertCanvasDocument(value);
  for (const object of value.objects) {
    if (object.kind !== "embedded-document" || object.documentType !== uiComponentDocumentType || object.parentId !== undefined)
      throw new TypeError("UI Builder accepts registered components only.");
    assertUIComponentContent(object.document);
    if (object.label.length > 10000) throw new TypeError("Component text is too long.");
  }
}
