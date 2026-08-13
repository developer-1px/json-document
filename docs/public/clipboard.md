# Clipboard

Clipboard는 고른 것을 복사하고, 잘라내고, 붙입니다. 여기 있는
Clipboard는 운영체제의 클립보드가 아닙니다. 선택이 만든 구조화된
payload입니다.

이 글은 그 payload가 문서와 어떻게 오가는지 설명합니다. 어디를
골랐는지는 [Selection](selection.md)이, 잘라낸 자리를 되돌리는 일은
[History](history.md)가 맡습니다.

## 구조화된 payload

문서 블록이면 블록 JSON과 그냥 읽을 수 있는 텍스트를 같이 듭니다.
표의 칸이면 칸 JSON과 TSV를 같이 듭니다.

오른쪽에서 블록을 고른 뒤 복사해 보세요. 아래 문서는 그대로이고,
Clipboard 칸에 payload가 생깁니다.

## 복사, 잘라내기, 붙여넣기

복사는 읽기만 합니다. 문서는 그대로입니다. 잘라내기는 그 payload를
만든 뒤에야 문서에서 지웁니다. 붙여넣기는 그 payload를 다시 문서로
돌려보냅니다.

바깥에서 온 아무 텍스트를 블록으로 해석할지는 제품을 만드는 쪽이
정합니다. 브라우저의 `Ctrl+C`로 옮기는 일은 아직 이 층이 아닙니다.
그건 다음 고리의 Web Connector입니다. 화면 줄 위에서 직사각형을
복사하려면 [Topology](topology.md)가 그 줄을 넘깁니다.
