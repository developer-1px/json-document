# Tree

Tree는 접히고 펼쳐지는 노드를 집는 편집기입니다. 화면에 보이는 노드 ID
줄을 Topology로 받습니다. 선택과 복사는 그 줄을 읽어 같은 범위를 씁니다.

자손을 포함한 복사와 잘라내기는 보이는 순서에서 고른 노드를 따라갑니다.
Document와 같이 범위 선택을 쓰지만, 처음 어떤 노드를 펼칠지는 Host
정책입니다. visible projection과 fold 수명주기는 ecosystem API가 맡습니다.

## API Reference

### `projectTreeVisibility(nodes, expandedIds)`

canonical `TreeNode[]`와 Host가 정한 expanded ID 집합을
`TreeVisibility`로 투영합니다. 반환값의 `rows`에는 `depth`, `posInSet`,
`setSize`, `hasChildren`, `expanded`가 있고, `topology.visibleIds`는 같은
순서의 ID 줄입니다. Demo와 Widget이 traversal을 따로 구현하지 않습니다.

### `treeVisibilityNeighbor(visibility, nodeId, navigation)`

이미 투영된 visible tree 안에서 위·아래·이전·다음, 부모·첫 visible 자식,
처음·끝 이동을 계산합니다. DOM focus나 물리 key 이름은 알지 않습니다.

### `useTreeEditing(options)`

React Connector의 Tree 전용 binding입니다. `initialExpandedIds`로 Host의
초기 정책을 받고 이후 expanded state, visible projection, fold-aware
keyboard neighbor, generic selection loop를 한 수명주기로 유지합니다.

```tsx
const editing = useTreeEditing({
  source: editor,
  nodes: document.nodes,
  initialExpandedIds: ["fruit"],
  selectedNodeIds: (topology) => editor.selectedNodeIdsIn(topology),
  focusNodeId,
  onSelect: (nodeId, mode, topology) => {
    editor.dispatch({ type: "selection.set", nodeId, mode, topology });
  },
  keyboard: {
    resolve: editingCommandFromWebKeyboardStroke,
    focusNodeId: () => currentFocusNodeId(),
    onDelete: (topology) => editor.dispatch({ type: "selection.remove", topology }),
  },
});
```

`editing.visibility.rows`와 `editing.visibility.topology`는 selection,
clipboard, renderer가 함께 쓰는 정본입니다. `expand`, `collapse`, `toggle`,
`isExpanded`는 fold control이 사용합니다. node renderer, 초기 expanded ID,
announcement 문구는 Host에 남습니다. React의 전체 type 계약은
[React editing](react-editing.md#usetreeediting-계약)에 있습니다.

## Live Demo

```live-demo
/demo/tree
```
