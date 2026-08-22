# Order

Order는 한 줄로 늘어선 항목을 집고 옮기는 편집기입니다. Document·Sheet·Tree와
같이 범위(range) 선택을 씁니다. 화면에 보이는 순서는 Topology 값입니다.

항목을 고르는 것만으로 공책 값은 바뀌지 않습니다. 옮기거나 붙이거나 지울 때
JSON Patch가 적용되고, 그때의 손가락 위치는 로컬 History에 같이 남습니다.

## Live Demo

```live-demo
/demo/order
```
