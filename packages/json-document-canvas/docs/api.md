## Canvas Hand 계약 · RC

`CanvasHand`는 `ObjectEditor`와 `CanvasCreationStyle`을 받아 글자·사각형·타원·자유
그리기, 다중 선택, 집합 이동·삭제, primary resize, Undo/Redo, JSON 재열기를 연결합니다.
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
      ├─ Affordance: createPlaneSelectProfile, gesture, resize
      │   └─ Selection: key 집합·primaryKey 전이
      ├─ UI Primitives: handle, icon controls·tooltips
      └─ Object Editing: Intent, ID 할당, Selection, History
          ├─ Object Document Type: Canvas profile, 검증, 연산, projection, JSON
          └─ Core: immutable 값과 atomic JSON Patch
```

이는 책임 관계이며 모든 입력이 통과하는 직렬 pipeline이 아닙니다.

### 입력과 History

- 도구를 고르고 클릭하면 기본 크기, 드래그하면 지정한 크기로 생성합니다.
  생성 후 Select로 돌아가며 새 객체를 선택합니다. 펜은 최소 두 지점이 필요합니다.
- 객체 click은 단일 선택, Shift+click은 toggle입니다. 빈 곳 click은 clear,
  drag는 marquee replace, Shift+marquee는 add입니다. Mod+A를 반복해도 전체 선택을 유지합니다.
  선택된 객체 press는 집합을 유지하고 release까지 drag가 없으면 단일 선택으로 바꿉니다.
- 선택된 객체를 끌면 집합 전체가 같은 delta로 이동합니다. 마지막 객체가 위에 표시됩니다.
  선택 윤곽은 모두 그리지만 네 모서리 resize handles는 primary 하나에만 붙습니다.
  Delete는 집합 전체를 한 번 삭제하며 primary resize/text 편집은 기존 선택 집합을 보존합니다.
  Focus만으로 선택하지 않으며, focused 객체에서 Space/Shift+Space로 선택/toggle합니다.
  focused 객체의 Enter는 그 객체를 선택하고 글자라면 편집합니다. 슬라이드 자체의
  Enter/F2는 현재 primary를 편집하며, F2는 객체에 focus가 있어도 primary를 대상으로 합니다.
- 글자는 생성 직후 또는 더블클릭/F2/Enter로 편집합니다. 줄바꿈·IME·선택·native
  입력 Undo는 textarea에 남습니다. blur 또는 Mod+Enter가 전체 draft를 한 번 commit하고
  Escape는 draft만 버립니다. 객체의 label이 실제 문자열 값입니다.
- 이동·resize·생성 중에는 문서를 변경하지 않습니다. pointerup의 최종 좌표로 한 번
  commit합니다. Escape, pointercancel, capture loss, 외부 문서 변경, unmount는 preview를
  버립니다. 다른 pointer의 release는 조작을 완료하지 못합니다. marquee 선택 preview도
  commit 전까지 Editing에 반영하지 않습니다. Escape는 gesture만 취소하고 idle에서 선택을 비웁니다.
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

단일 슬라이드를 컨테이너에 맞춰 표시합니다. 확대/축소·페이지·팬·다중 resize·그룹·회전·
snap·레이어·Clipboard UI·PPTX·collaboration은 이번 Hand의 지원 범위가 아닙니다.
`creationStyle`은 새 객체에만 적용하는 제품 기본값이며 저장 객체의 스타일을 덮어쓰지 않습니다.

선택은 Affordance의 [평면 Select 프로파일](/docs/api/affordance)을 소비합니다.
`selectProfile`을 주입하거나 생략하여 기본 instance를 만들 수 있습니다. instance는 Hand마다
독립적이어야 합니다. `useCanvasHand(editor, style, selectProfile?)`의 `selection`과 `marquee`는
현재 표시할 preview이며, `snapshot.selection`은 Editing에 확정된 선택입니다.

```live-demo
/demo/canvas
```

샘플이 있는 두 번째 Host도 같은 Hand를 사용합니다.

```live-demo
/widgets/canvas
```
