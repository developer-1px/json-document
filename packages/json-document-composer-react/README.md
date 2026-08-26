# @interactive-os/json-document-composer-react

Official React interaction and reference projection integration for JSON Document Composer.

```tsx
const composer = useComposer({ id: "agent-composer", config, ports, labels });

<RichTextEditorSurface
  editor={composer.editor}
  elementRef={composer.editorElementRef}
  onKeyDownCapture={composer.handleKeyDown}
  renderExtension={composer.renderReference}
/>;
```

Mention projection delegates to
`@interactive-os/json-document-rich-text-mention-react`; suggestion interaction is
composed from the canonical suggestion packages.

Product copy, styling, layout, suggestions, and concrete ports remain Host-owned.
Draft/editor subscription, suggestion integration, keyboard/history execution, Web file
intake, focus recovery, and submit lifecycle remain canonical across Host replacements.
