## Canvas Hand 계약 · RC

`CanvasHand`는 `ObjectEditor`와 `CanvasCreationStyle`을 받아 글자·사각형·타원·자유
그리기, 이미지·텍스트 붙여넣기, 다중 선택, 집합 이동·복제·삭제, native Clipboard, primary resize, Undo/Redo, JSON 재열기를 연결합니다.
`useCanvasHand`는 같은 입력 조합을 custom UI에서 사용할 수 있게 공개합니다.

툴바의 모든 도구·명령은 Lucide 아이콘과 공통 `Toggle`/`Command`의 `label`을
사용합니다. label이 접근성 이름과 hover/focus 툴팁의 정본이며, 별도 툴팁이나
버튼 구현을 두지 않습니다. 선택 도구는 `aria-pressed`, 실행 불가 명령은
`disabled`로 상태를 전달합니다.

```text
Host: 한 장 fixture, 크기·색상 정책, 레이아웃
  └─ Canvas Hand: 도구, 조작 preview, plain-text draft, UI 조합
      ├─ React Connector: Editing snapshot 구독
      ├─ Web Adapter: SVG 좌표, pointer capture, keyboard·Clipboard 해석
      ├─ File Intake: 붙여넣은 파일의 형식·개수·용량 정책 검사
      ├─ Affordance: createPlaneSelectProfile, gesture, resize
      │   └─ Selection: key 집합·primaryKey 전이
      ├─ UI Primitives: handle, icon controls·tooltips
      └─ Object Editing: Intent, ID 할당, Selection, History, 외부 내용 변환·paste 순서/취소
          ├─ Object Document Type: Canvas profile, 검증, 연산, projection, JSON
          └─ Core: immutable 값과 atomic JSON Patch
```

이는 책임 관계이며 모든 입력이 통과하는 직렬 pipeline이 아닙니다.

### 입력과 History

- 도구를 고르고 클릭하면 기본 크기, 드래그하면 지정한 크기로 생성합니다.
  사각형·타원·글자는 누르거나 작게 흔들리는 동안 기본 크기를 미리 표시하지 않습니다.
  시작점에서 3 문서 단위 이상 움직이면 실제 드래그 상자만 표시하며, 다시 시작점 근처로
  돌아와도 클릭 크기로 바뀌지 않습니다. 클릭 기본 크기는 놓을 때 press 위치에만 생성합니다.
  드래그 후 시작점에 정확히 돌아와 놓으면 객체나 History를 만들지 않습니다.
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
- Alt/Option+drag는 선택 집합을 복제합니다. 원본을 남기고 사본 위치를 preview하며
  release에 새 ID를 할당합니다. Alt를 도중에 누르거나 놓으면 copy/move가 전환됩니다.
  Shift+drag는 큰 delta 축을 고정하며 Shift+click toggle과 구분합니다.
  Mod+D 또는 아이콘 툴바의 복제는 24단위 offset으로 복제하고 사본 집합·대응 primary를 선택합니다.
- 방향키는 선택 집합을 1단위, Shift+방향키는 10단위 이동합니다. 수정 키 없는 입력만
  처리하며 text/JSON 입력과 IME의 키보드 소유권은 보존합니다.
- 이동·resize·생성 중에는 문서를 변경하지 않습니다. pointerup의 최종 좌표로 한 번
  commit합니다. Escape, pointercancel, capture loss, 외부 문서 변경, unmount는 preview를
  버립니다. 다른 pointer의 release는 조작을 완료하지 못합니다. marquee 선택 preview도
  commit 전까지 Editing에 반영하지 않습니다. Escape는 gesture만 취소하고 idle에서 선택을 비웁니다.
- 선택만 바꾸거나 0 거리로 움직이면 History가 생기지 않습니다. commit된 편집은
  한 번의 Undo로 되돌리며 삭제 Undo는 객체와 선택을 함께 복원합니다. Mod+Z/Mod+Shift+Z는
  입력 필드 밖에서 문서 Undo/Redo를 실행합니다.

### Native Clipboard

선택 객체의 Mod+C/X/V 또는 브라우저 native copy/cut/paste 이벤트를 Web Clipboard
binding에 연결합니다. 구조화 MIME과 label의 `text/plain`을 함께 쓰므로 다른 Canvas
instance로 객체를 복사하거나 다른 앱에 문자열을 붙일 수 있습니다. 앱 내부 가상
clipboard는 만들지 않습니다. 복제 버튼은 OS clipboard를 바꾸지 않는 별도 명령입니다.

cut은 쓰기에 성공한 캡처 대상만 제거합니다. 쓰기 실패나 Editing 거절은 오류로 드러내고
문서 삭제나 브라우저 fallback 삭제를 허용하지 않습니다. paste는 새 ID·대응 primary로
선택합니다. Editing의 cascade placement로 24/24씩 이동하여 기존 객체와 시작점이 겹치지 않는
첫 위치를 고릅니다. 객체 간 완전한 충돌 회피나 슬라이드 안 자동 배치는 아닙니다.
text/JSON textarea의 native clipboard는 가로채지 않습니다.

`createCanvasClipboardBinding(editor, policy, options?)`가 이 연결의 공개 API입니다.
구조화 Object → 이미지 파일 → 이미지가 포함된 HTML → 일반 텍스트 순서로 처리하며 잘못된 Object MIME은 문자열로
조용히 변환하지 않습니다. 외부 문자열은 한 text 객체가 되며 HTML 서식을 보존하지 않고
줄바꿈·Unicode를 그대로 보존합니다. PNG/JPEG/WebP는 문서 내부 base64 image 객체로 넣습니다.
기본은 한 paste당 최대 4개, 파일당 10 MiB, decode 후 이미지당 16,000,000픽셀입니다.
이미지는 비율을 유지해 슬라이드 75% 상자에 맞추고 확대하지 않습니다. 후속 resize는 일반
객체와 같은 자유 상자 변환입니다. `policy.files`와 `maxImagePixels`로 입력 정책을 지정할 수
있지만 Object 모델이 지원하지 않는 이미지 표현까지 허용되는 것은 아닙니다.

HTML은 Web의 inert parser와 이미지 준비 API를 사용합니다. 포함된 PNG/JPEG/WebP data URL과
글을 HTML 내부 순서대로 text/image 객체로 바꿉니다. Editing의 `createCanvasClipboard`가
간격을 둔 세로 흐름으로 배치하고, 전체 높이가 넘으면 이미지 비율·글자 크기·간격을 함께
줄여 상자 안에 맞춥니다. 긴 내용을 원래 글자 크기로 읽거나 CSS·Office 배치를 재현하는
기능은 아닙니다. source가 없거나 외부·상대·blob·cid URL이면 글만 남기지 않고 전체를 거절합니다.
HTML과 native 파일이 함께 있으면 파일을 우선하고, 두 표현을 합치거나 중복 삽입하지 않습니다.

같은 batch는 순차 decode로 준비하고 모두 성공한 경우만 한 번 삽입합니다. 연속 paste는
Editing paste session을 통해 입력 순서대로 각각 commit/Undo를 만듭니다. 진행 상태를 표시하고
Escape·다른 도구/편집·외부 문서/선택·unmount는 준비를 취소합니다. 늦은 완료는 문서를 바꾸거나
오류 상태를 덮어쓰지 않습니다. `pending`, `cancel()`, `onResult`, `onPendingChange`를 공개하며
`readRaster`에는 Web API와 호환되는 구체 환경 인스턴스를 주입할 수 있습니다.

이미지도 기존 다중 선택·이동·복제·copy/cut/paste·삭제·Undo/Redo와 JSON 재열기를 사용합니다.
이미지용 별도 생성 도구, 외부 URL/SVG·전체 HTML layout import, 이미지 파일 export, asset 서버,
async clipboard 툴바는 아직 지원하지 않습니다. 표준 MIME이 없는 입력이나 실패는 오류로 드러냅니다.

### JSON

JSON 버튼은 현재 문서 문자열을 노출합니다. 이 문자열을 저장해 다시 JSON 입력에
넣고 `JSON 열기`로 복원할 수 있습니다. 재열기는 전체 문서 교체 한 번으로 기록하고
선택을 비우며 Undo도 가능합니다. 잘못된 JSON은 오류를 표시하고 기존 문서와 History를
보존합니다. 새 ObjectEditor에 deserialize한 값을 넣으면 새 History 세션으로 시작합니다.
파일 시스템·서버 persistence 정책은 Host 범위입니다.

### 범위와 Usage

단일 슬라이드를 컨테이너에 맞춰 표시합니다. 확대/축소·페이지·팬·다중 resize·그룹·회전·
snap·레이어·PPTX·collaboration은 이번 Hand의 지원 범위가 아닙니다.
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
