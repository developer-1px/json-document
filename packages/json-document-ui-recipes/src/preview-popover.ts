import type { RecipeSpec } from "./types.js";

/** A floating look at what a link points to, beside the link, without leaving the view. */
export const previewPopover: RecipeSpec = {
  recipe: {
    id: "preview-popover",
    name: "Preview popover",
    evidence: [
      { product: "Wikipedia Page Previews", url: "https://www.mediawiki.org/wiki/Page_Previews" },
      { product: "GitHub hovercard (Primer Hovercard)", url: "https://primer.style/product/components/hovercard/" },
      { product: "macOS Quick Look", url: "https://support.apple.com/guide/mac-help/view-and-edit-files-with-quick-look-mh14119/mac" },
    ],
    standards: [
      { name: "HTML popover attribute", url: "https://html.spec.whatwg.org/multipage/popover.html" },
      { name: "WAI-ARIA APG Dialog", url: "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/" },
    ],
    anatomy: { required: ["anchor", "title", "body", "close"], optional: ["open-original"] },
    rules: [
      { id: "UIR1-PV-001", name: "open", statement: "일반 클릭·Enter는 미리보기를 열고, 수정키·가운데 클릭은 원래 이동을 따른다.", owner: "host" },
      { id: "UIR1-PV-002", name: "place", statement: "패널은 기준 요소 옆, 가리지 않고 화면 안에 놓인다.", owner: "host" },
      { id: "UIR1-PV-003", name: "dismiss", statement: "Escape와 바깥 클릭으로 닫힌다.", owner: "host" },
      { id: "UIR1-PV-004", name: "focus", statement: "열리면 패널로, 닫히면 기준 요소로 초점이 간다.", owner: "host" },
      { id: "UIR1-PV-005", name: "replace", statement: "한 번에 하나만 열리고, 다른 내용을 요청하면 교체된다.", owner: "host" },
      { id: "UIR1-PV-006", name: "scroll-per-content", statement: "내용마다 스크롤을 따로 둔다: 처음 보는 내용은 맨 위, 다시 연 내용은 읽던 자리.", owner: "host" },
    ],
    variants: [
      { id: "hovercard", status: "candidate", statement: "pointer hover와 키보드 초점으로 열리고 pointer가 떠나면 닫힌다. UIR1-PV-001 대신 hover 열기를 쓰고 나머지 규칙은 같다." },
    ],
  },
  vectors: {
    recipe: "preview-popover",
    fixture: { contents: [{ id: "A", scrollable: 200 }, { id: "B" }] },
    cases: [
      {
        id: "open-on-activation",
        requirements: ["UIR1-PV-001", "UIR1-PV-004"],
        steps: [
          { do: "open", content: "A" },
          { expect: "open", count: 1, content: "A" },
          { expect: "focused", value: "panel" },
        ],
      },
      {
        id: "modified-activation-follows-link",
        requirements: ["UIR1-PV-001"],
        variants: { hovercard: "skip" },
        steps: [
          { do: "open", content: "A", modifier: "Shift" },
          { expect: "open", count: 0 },
        ],
      },
      {
        id: "placed-beside-anchor",
        requirements: ["UIR1-PV-002"],
        steps: [
          { do: "open", content: "A" },
          { expect: "placement", value: "beside-anchor" },
          { expect: "placement", value: "within-viewport" },
        ],
      },
      {
        id: "escape-closes-and-returns-focus",
        requirements: ["UIR1-PV-003", "UIR1-PV-004"],
        steps: [
          { do: "open", content: "A" },
          { do: "press", key: "Escape" },
          { expect: "open", count: 0 },
          { expect: "focused", value: "anchor" },
        ],
      },
      {
        id: "outside-click-closes",
        requirements: ["UIR1-PV-003"],
        steps: [
          { do: "open", content: "A" },
          { do: "click-outside" },
          { expect: "open", count: 0 },
        ],
      },
      {
        id: "request-replaces",
        requirements: ["UIR1-PV-005"],
        steps: [
          { do: "open", content: "A" },
          { do: "open", content: "B" },
          { expect: "open", count: 1, content: "B" },
        ],
      },
      {
        id: "scroll-kept-per-content-across-close",
        requirements: ["UIR1-PV-006"],
        steps: [
          { do: "open", content: "A" },
          { do: "scroll", by: 200 },
          { expect: "scrollTop", value: 200 },
          { do: "press", key: "Escape" },
          { do: "open", content: "B" },
          { expect: "scrollTop", value: 0 },
          { do: "press", key: "Escape" },
          { do: "open", content: "A" },
          { expect: "scrollTop", value: 200 },
        ],
      },
      {
        id: "scroll-kept-per-content-across-replace",
        requirements: ["UIR1-PV-005", "UIR1-PV-006"],
        steps: [
          { do: "open", content: "A" },
          { do: "scroll", by: 200 },
          { do: "open", content: "B" },
          { expect: "scrollTop", value: 0 },
          { do: "open", content: "A" },
          { expect: "scrollTop", value: 200 },
        ],
      },
    ],
  },
};
