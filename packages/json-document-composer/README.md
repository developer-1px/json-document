# @interactive-os/json-document-composer

Headless Composer profile, draft commands, Host policy schema, interaction meaning,
skill references and triggers for JSON Document Rich Text. Entity mention schema and
insertion come from `@interactive-os/json-document-rich-text-mention`; platform-independent
file validation comes from `@interactive-os/json-document-file-intake`. Composer promotes
those validated candidates into Composer context attachments.

`resolveComposerSuggestions(trigger, suggestions)` owns trigger-aware matching of a
product-configured suggestion catalog. React menu lifecycle and atom projection live in
`@interactive-os/json-document-composer-react`.

`composerInteractionFromKeyStroke(stroke, policy)` preserves the existing
`commandKey` input (Meta or Control) and accepts optional `altKey` alongside
`shiftKey`. Omitted modifiers are false. Its keyboard compatibility boundary
uses `@interactive-os/json-document-web`'s pure default resolver for Undo/Redo:
Mod+Z undoes, Mod+Shift+Z redoes, and Alt-modified variants return `null`.
Composer still owns Escape and the configured Enter submit/newline meaning.
The keyboard dependency is confined to `interaction.ts`; draft model, schema,
and commands do not interpret Web events. No DOM environment is required.

Usage: [Composer](https://developer-1px.github.io/json-document/demo/composer).
The React integration passes all modifier facts to this boundary.
