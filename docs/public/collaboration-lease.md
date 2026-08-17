# Contenteditable lease

같이 쓰는 문자열을 브라우저 contenteditable에 붙일 때, 모델은 계속 변경을
받아들이고 화면 DOM 고치기만 잠시 미룹니다. 이 상태가 native-input DOM
lease입니다.

로컬 Contenteditable Adapter와 다릅니다. Adapter는 로컬 JSON Document
문자열을 화면에 연결합니다. lease는 협업 문자열이 입력 중에도 인과 변경을
멈추지 않게 합니다.

IME 조합이 끝나는 동안에도 엔진은 다른 참여자의 변경을 계속  mo압니다.
