# @interactive-os/json-document-ui-primitives-react

Official minimalist React surfaces for common Hands. Primitives own complete
keyboard, pointer, focus, cursor, and semantic markup behavior while hosts own
product data, policy, composition, and visual extension.

Control meaning is intentionally compressed, not removed:

- `ActionButton` keeps text for flow-completing CTAs.
- `IconButton` requires an accessible label and exposes the same label as a
  visible tooltip for contextual actions.
- `ToggleButton`, `ChoiceChip`, and `SegmentedControl` preserve state and
  choice semantics without radio-button chrome.
- `Tabs` owns tab semantics and roving keyboard focus.
- `DisclosureButton` owns expanded and controlled-panel semantics.

The package emits stable `data-ui-*` hooks. Products may map those hooks to
their tokens, but must not recreate semantic, focus, or keyboard behavior.

The other public surfaces include `Select`, `Menu`, `FileDropRegion`,
`GridCell`, and `ResizeHandle`.

`formatFileSize(bytes)` provides the canonical compact `B`/`KB`/`MB` display
policy for file metadata rendered by Hands.
