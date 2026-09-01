# @interactive-os/json-document-ui-primitives-react

Official minimalist React surfaces for common Hands. Primitives own complete
keyboard, pointer, focus, cursor, and semantic markup behavior while hosts own
product data, policy, composition, and visual extension.

Public APIs are named by semantic role. Label, icon, chip, inline, and popup are
presentations rather than parallel component owners:

- `Command` executes an action; label-only and icon-only forms share the API.
- `Toggle` changes a persistent binary state; switch and chip forms share the API.
- `Choice` owns single-choice semantics; inline and popup forms share the API.
- `Tabs` owns tab semantics and roving keyboard focus.
- `DisclosureButton` owns expanded and controlled-panel semantics.

The package emits stable `data-ui-*` hooks. Products may map those hooks to
their tokens, but must not recreate semantic, focus, or keyboard behavior.
Products may declare the composition-specific exposure grammar through the
public `ControlAffordance` vocabulary; primitives project it as
`data-ui-affordance` without changing their semantic control role.

`SelectableItem`, `GridCell`, and `contentInteractionAttributes` project the
canonical content interaction grammar. Import `content-interaction.css` once,
then map its CSS variables to product tokens. Selection remains a quiet content
contour; the primary member of the selection set becomes control-ready through
low elevation, while `active` and `dragging` continue the same interaction
grammar without changing layout.

Calendar widgets and projections belong to `@interactive-os/json-document-calendar`.
File metadata formatting belongs to `@interactive-os/json-document-file-intake`.
`ProductShell` is composition over the role primitives, not another control role.
Use `toolbarPresentation="floating"` when a product's controls form a distinct
functional layer above edge-to-edge content; the default `attached` presentation
remains part of document flow.
