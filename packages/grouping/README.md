# @interactive-os/json-document-grouping

Official extension for structural `group` and `ungroup`.

> `0.1.1-rc.0` is a companion prerelease for
> `@interactive-os/json-document@1.1.0-rc.0`. Pin both versions exactly while
> the core mutation result contract is under integration testing.

## Scope

- select contiguous sibling JSON array items
- create one host-defined group value
- ungroup a host-defined group value back into sibling items
- return JSON Patch operations and `selectionAfter`
- validate through the public `@interactive-os/json-document` document facade
- does not call `doc.use(...)`

## Non-goals

- 2D bounds
- hit testing
- group-local coordinates
- visual selection handles
- object-surface grouping semantics
- app-specific ids beyond the host `createGroup` function

```ts
const grouping = createGrouping(doc, {
  isGroup: (value) => isGroupNode(value),
  getChildren: (value) => isGroupNode(value) ? value.children : null,
  createGroup: (children) => ({
    type: "group",
    id: crypto.randomUUID(),
    children,
  }),
});

const canGroup = grouping.canGroup(["/items/0", "/items/1"]);
if (canGroup.ok) grouping.group(canGroup.source);
```

## Friction report

- `group` is a real editor feature vocabulary, but the JSON shape is host-owned.
- Public pointer helpers were enough for same-parent selection planning.
- `selectionAfter` is useful enough to belong in the extension result.
- The JSON shape remains host-owned so apps can use their own group schema.
