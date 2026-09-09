## Canvas Hand 계약 · RC

`CanvasHand`는 `ObjectEditor`와 `CanvasCreationStyle`을 받아 글자·사각형·타원·자유
그리기, 단일 선택, 이동·resize·삭제, Undo/Redo, JSON 재열기를 연결합니다.
`useCanvasHand`는 같은 입력 조합을 custom UI에서 사용할 수 있게 공개합니다.

툴바의 모든 도구·명령은 Lucide 아이콘과 공통 `Toggle`/`Command`의 `label`을
사용합니다. label이 접근성 이름과 hover/focus 툴팁의 정본이며, 별도 툴팁이나
버튼 구현을 두지 않습니다. 선택 도구는 `aria-pressed`, 실행 불가 명령은
`disabled`로 상태를 전달합니다.

```text
Host: 한 장 fixture, 크기·색상 정책, 레이아웃
  └─ Canvas Hand: 도구, 조작 preview, plain-text draft, UI 조합
      ├─ React Connector: Editing snapshot 구독
      ├─ Web Adapter: SVG 좌표, pointer capture, keyboard 해석
      ├─ Affordance / UI Primitives: gesture, drag/resize, handle, controls
      └─ Object Editing: Intent, ID 할당, Selection, History
          ├─ Object Document Type: Canvas profile, 검증, 연산, projection, JSON
          └─ Core: immutable 값과 atomic JSON Patch
```

이는 책임 관계이며 모든 입력이 통과하는 직렬 pipeline이 아닙니다.

### 입력과 History

- 도구를 고르고 클릭하면 기본 크기, 드래그하면 지정한 크기로 생성합니다.
  생성 후 Select로 돌아가며 새 객체를 선택합니다. 펜은 최소 두 지점이 필요합니다.
- 객체 경계 상자를 집어 움직이고 네 모서리 손잡이로 resize합니다. 마지막 객체가
  위에 표시되며 단일 선택만 UI로 제공합니다. ObjectEditor의 기존 집합 API는 유지합니다.
- 글자는 생성 직후 또는 더블클릭/F2/Enter로 편집합니다. 줄바꿈·IME·선택·native
  입력 Undo는 textarea에 남습니다. blur 또는 Mod+Enter가 전체 draft를 한 번 commit하고
  Escape는 draft만 버립니다. 객체의 label이 실제 문자열 값입니다.
- 이동·resize·생성 중에는 문서를 변경하지 않습니다. pointerup의 최종 좌표로 한 번
  commit합니다. Escape, pointercancel, capture loss, 외부 문서 변경, unmount는 preview를
  버립니다. 다른 pointer의 release는 조작을 완료하지 못합니다.
- 선택만 바꾸거나 0 거리로 움직이면 History가 생기지 않습니다. commit된 편집은
  한 번의 Undo로 되돌리며 삭제 Undo는 객체와 선택을 함께 복원합니다. Mod+Z/Mod+Shift+Z는
  입력 필드 밖에서 문서 Undo/Redo를 실행합니다.

### JSON

JSON 버튼은 현재 문서 문자열을 노출합니다. 이 문자열을 저장해 다시 JSON 입력에
넣고 `JSON 열기`로 복원할 수 있습니다. 재열기는 전체 문서 교체 한 번으로 기록하고
선택을 비우며 Undo도 가능합니다. 잘못된 JSON은 오류를 표시하고 기존 문서와 History를
보존합니다. 새 ObjectEditor에 deserialize한 값을 넣으면 새 History 세션으로 시작합니다.
파일 시스템·서버 persistence 정책은 Host 범위입니다.

### 범위와 Usage

단일 슬라이드를 컨테이너에 맞춰 표시합니다. 확대/축소·페이지·팬·다중 선택·그룹·회전·
snap·레이어·Clipboard UI·PPTX·collaboration은 이번 Hand의 지원 범위가 아닙니다.
`creationStyle`은 새 객체에만 적용하는 제품 기본값이며 저장 객체의 스타일을 덮어쓰지 않습니다.

```live-demo
/demo/canvas
```

샘플이 있는 두 번째 Host도 같은 Hand를 사용합니다.

```live-demo
/widgets/canvas
```
