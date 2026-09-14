# 셀 편집 조작

`cellEditingAffordance(stroke, {editing, allSelected})`는 기존 rename·focus·select-all 계약을 조합합니다. Enter/F2 또는 문자 입력은 편집 시작, Enter는 확정 후 아래 이동, Shift+Enter는 위 이동, Escape는 취소, Tab/Shift+Tab은 셀 이동을 뜻합니다.

편집 중 일반 문자·방향키·Mod+A는 native field에 남깁니다. `rename` hand의 `initialText`는 입력으로 시작하는 초안, `move`는 성공적인 확정 이후 이동 방향입니다. 조합 중 키는 Web owner의 `isWebComposingKey`로 먼저 제외합니다.

[Sheet Usage](/demo/sheet)에서 `useRenameSession`과 함께 사용합니다. 초안 확정이 거절되면 이동하지 않고 초안을 유지해야 합니다.

`gridEditingProfiles["spreadsheet-mac"]`은 선택 상태에서 Enter로 편집을 시작합니다. 편집 중 Enter는 확정 후 아래로 이동합니다. [Sheet Views Usage](/demo/sheet-views)에서 SheetHand는 Mac의 기본 spreadsheet-grid에 이 정책을 적용하며, 명시한 프로파일 객체는 그대로 사용합니다.
