import { createCanvasHTML } from "@interactive-os/json-document-editing";
import type { CanvasDocument } from "@interactive-os/json-document-object-document";
import { webCanvasHTMLAdapter } from "@interactive-os/json-document-web";
// Application fixture: the editing and review lifecycle remains in canonical packages.
export function createReviewDocument(): CanvasDocument {
  const pages = [
    { id: "review-introduction", label: "소개 문장", title: "좋은 생각을, 함께 더 명확하게.", body: "우리는 복잡한 아이디어를 누구나 이해할 수 있는 이야기로 만듭니다. 이 문장을 짚고 더 짧게, 더 구체적으로 고쳐 달라고 말해보세요." },
    { id: "review-next-step", label: "다음 행동", title: "작은 시도에서 시작하세요.", body: "한 문장을 고친 다음, 다른 페이지에도 수정을 요청해보세요. 진행 중인 작업과 확인할 결과는 해당 위치에 표시됩니다." },
  ];
  return { profile: "canvas/1", width: 960, height: 540, objects: pages.map((page, index) => ({
    ...createCanvasHTML(`<style>*{box-sizing:border-box}body{margin:0;background:#faf8f3;color:#25352f;font-family:Arial,sans-serif}main{padding:76px;height:540px}h1{font-size:52px;line-height:1.2;letter-spacing:-2px;margin:44px 0 28px}p{font-size:23px;line-height:1.7;max-width:720px}small{font-size:14px;color:#62756b}</style><main data-node-id="page"><small data-node-id="eyebrow">${page.label}</small><h1 data-node-id="title">${page.title}</h1><p data-node-id="body">${page.body}</p></main>`, { x: 0, y: index * 600, width: 960, height: 540 }, page.label, webCanvasHTMLAdapter), id: page.id,
  })) };
}

