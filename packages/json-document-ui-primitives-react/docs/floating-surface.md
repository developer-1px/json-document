# Floating surfaces

`floatingSurface.control`과 `floatingSurface.panel`은 floating 컨트롤과 펼쳐진 패널의 정본 표면입니다. 기존 Toolbar·Popover·Command·Field를 조합합니다. Host는 위치, 크기, 간격과 제품 동작을 소유하며 투명도·blur·테두리·그림자·모서리를 복제하지 않습니다.

```tsx
import { floatingSurface, Toolbar, Command } from "@interactive-os/json-document-ui-primitives-react";
import "@interactive-os/json-document-ui-primitives-react/floating-surface.css";

<Toolbar label="문서 도구" className={floatingSurface.control}>
  <Command onClick={save}>저장</Command>
</Toolbar>
```

Popover의 `panelClassName`에는 `floatingSurface.panel`을 전달합니다. ProductShell의 `toolbarPresentation="floating"`도 같은 표면을 소비합니다. CSS를 한 번 import하고 Host의 semantic color/radius/shadow tokens로 조정합니다. 투명도 감소 및 강제 색상 모드를 지원합니다. 위치 지정과 팝오버 dismiss/focus는 이 스타일 API가 소유하지 않습니다.

[Site UI primitives catalog](/demo/ui-primitives#design-system-floating-controls)의 Floating controls Usage와 Source 등록에서 구현을 확인할 수 있습니다. Bear와 Calendar도 동일 API를 소비합니다.
