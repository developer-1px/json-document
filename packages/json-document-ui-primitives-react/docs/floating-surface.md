# Floating surfaces

`floatingSurface.control`과 `floatingSurface.panel`은 floating 컨트롤과 펼쳐진 패널의 정본 표면입니다. 기존 Toolbar·Popover·Command·Field를 조합합니다. Host는 위치, 크기, 간격과 제품 동작을 소유하며 투명도·blur·테두리·그림자·모서리를 복제하지 않습니다.

```tsx
import { floatingSurface, Toolbar, Command } from "@interactive-os/json-document-ui-primitives-react";
import "@interactive-os/json-document-ui-primitives-react/design-system.css";
import "@interactive-os/json-document-ui-primitives-react/floating-surface.css";

<Toolbar label="문서 도구" className={floatingSurface.control}>
  <Command onClick={save}>저장</Command>
</Toolbar>
```

Popover의 `panelClassName`에는 `floatingSurface.panel`을 전달합니다. ProductShell의 `toolbarPresentation="floating"`도 같은 표면을 소비합니다. CSS를 한 번 import하고 Host의 semantic color/radius/shadow tokens로 조정합니다. 투명도 감소 및 강제 색상 모드를 지원합니다. 위치 지정과 팝오버 dismiss/focus는 이 스타일 API가 소유하지 않습니다.

[Site UI primitives catalog](/demo/ui-primitives#design-system-floating-controls)의 Floating controls Usage와 Source 등록에서 구현을 확인할 수 있습니다. Bear와 Calendar도 동일 API를 소비합니다.

공통 디자인 CSS를 함께 소비한 Floating Toolbar는 기본 4px inset을 사용합니다. 일반 내용 패널의 간격은 Host가 기존 8/12/16px 안에서 조합하며 표면 효과를 복제하지 않습니다.

Floating Toolbar와 ToolbarGroup의 직접 Popover 텍스트 트리거는 바깥 표면과
테두리를 중복하지 않습니다. 공통 hover·focus와 Popover 동작은 유지합니다.

## WindowDock

`WindowDock` composes independent non-modal panels with the canonical floating
surfaces, `DisclosureButton` and `Command`. Import it from the package root and
import `floating-surface.css` once. Hosts place the dock and supply items
(`id`, `title`, optional `status`, `content`), `activeId`, `onActivate`, an optional
`action`, and an optional `notice`.

Activating an item opens it without closing other requested panels. Clicking its
title again or the panel's collapse control hides it. Contents stay mounted so
in-flight work, editor selection and drafts survive hiding. Activity updates do
not open panels or move focus. Width determines the number of visible panels;
when space is limited, the most recently opened panels remain visible. Expanding
the viewport restores requested panels. The title row scrolls when necessary.
These are independent disclosures, not mutually exclusive ARIA tabs.

The Host may set `--window-dock-max-height`; the default is `65dvh`. Colors,
radii and elevation stay with `floatingSurface`. See the Canvas Application's
Usage/Source for `WindowDock` and the package's generated API reference for types.

`WindowDock.onClose(id)`를 제공하면 창 머리글에 닫기 버튼이 나타납니다.
접기는 콘텐츠를 유지하며, 닫기의 제거·작업 중단 정책은 소비자가 소유합니다.
Canvas는 닫을 때 목록에서 제거하고 진행 중 요청을 중단합니다. 모든 창을 닫아도 새 대화로 다시 시작할 수 있습니다.

`WindowDock.activationKey` can be changed to reopen `activeId` even if the user
collapsed that same window. Mounted contents and their input drafts are retained.
