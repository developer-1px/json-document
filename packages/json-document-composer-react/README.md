# @interactive-os/json-document-composer-react

Official React interaction and reference projection integration for JSON Document Composer.

```tsx
const commandMenu = useComposerCommandMenu({
  id: "composer-command-listbox",
  label: "Commands",
  editor,
  trigger,
  suggestions,
  createId,
});

<ComposerReferenceAtom node={node} className="composer-reference" />;
```

Mention projection delegates to
`@interactive-os/json-document-rich-text-mention-react`; Composer retains the skill
projection and command-menu composition.

Product copy, styling, layout, suggestions, and concrete ports remain Host-owned.
