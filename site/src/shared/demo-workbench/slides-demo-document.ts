import { createCanvasHTML } from "@interactive-os/json-document-editing";
import { webCanvasHTMLAdapter } from "@interactive-os/json-document-web";
import type { CanvasDocument } from "@interactive-os/json-document-object-document";

// Authored slide artwork, independent of application UI tokens.
const style = `<style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#f6f3eb;color:#17243a}.page{padding:64px 72px;height:540px;display:flex;flex-direction:column}.eyebrow{font-size:14px;letter-spacing:3px;color:#087f8c;margin:0 0 30px}h1{font-size:52px;line-height:1.15;letter-spacing:-2px;margin:0 0 24px;max-width:750px}p{font-size:21px;line-height:1.6;margin:0;color:#526071}.footer{margin-top:auto;font-size:13px;color:#7a8490}.columns{display:flex;gap:32px;margin-top:24px}.column{flex:1;border-top:3px solid #087f8c;padding-top:20px}h2{font-size:27px;margin:0 0 12px}.number{color:#087f8c;font-size:16px;margin-bottom:20px}</style>`;
export const blankSlideHTML = `${style}<main class="page" data-node-id="page"><p class="eyebrow" data-node-id="eyebrow">YOUR NEXT IDEA</p><h1 data-node-id="title">새로운 이야기를 시작하세요</h1><p data-node-id="body">텍스트를 더블클릭해 고치거나, 채팅으로 이 페이지를 만들어 보세요.</p><p class="footer" data-node-id="footer">PRESENTATION</p></main>`;
const slides = [
  { label: "함께 만드는 프레젠테이션", html: `${style}<main class="page" data-node-id="page"><p class="eyebrow" data-node-id="eyebrow">IDEAS INTO STORIES</p><h1 data-node-id="title">생각을 한 장씩, 함께 완성하는 이야기.</h1><p data-node-id="body">내용은 직접 고치고, 디자인은 대화로 다듬으세요. 한 번에 한 페이지에 집중합니다.</p><p class="footer" data-node-id="footer">01 / 시작하기</p></main>` },
  { label: "작게 만들고 함께 다듬기", html: `${style}<main class="page" data-node-id="page"><p class="eyebrow" data-node-id="eyebrow">A SIMPLE WORKFLOW</p><h1 data-node-id="title">세 단계면 충분합니다.</h1><div class="columns" data-node-id="steps"><article class="column" data-node-id="step-1"><p class="number" data-node-id="number-1">01</p><h2 data-node-id="title-1">내용을 담고</h2><p data-node-id="body-1">전하고 싶은 메시지를 자유롭게 적어보세요.</p></article><article class="column" data-node-id="step-2"><p class="number" data-node-id="number-2">02</p><h2 data-node-id="title-2">대화로 다듬고</h2><p data-node-id="body-2">선택한 페이지에 필요한 변화를 요청하세요.</p></article><article class="column" data-node-id="step-3"><p class="number" data-node-id="number-3">03</p><h2 data-node-id="title-3">이야기를 완성</h2><p data-node-id="body-3">스크롤하며 전체 흐름을 확인하고 정리하세요.</p></article></div></main>` },
  { label: "다음 이야기를 시작하세요", html: blankSlideHTML },
];
export function createSlidesDemoDocument(): CanvasDocument {
  return { profile: "canvas/1", width: 960, height: 540, objects: slides.map((slide, index) => ({ ...createCanvasHTML(slide.html, { x: 0, y: index * 600, width: 960, height: 540 }, slide.label, webCanvasHTMLAdapter), id: `slide-${index + 1}` })) };
}
