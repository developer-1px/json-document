# @interactive-os/json-document-composer

Headless Composer profile, draft commands, Host policy schema, interaction meaning,
skill references and triggers for JSON Document Rich Text. Entity mention schema and
insertion come from `@interactive-os/json-document-rich-text-mention`; platform-independent
file validation comes from `@interactive-os/json-document-file-intake`. Composer promotes
those validated candidates into Composer context attachments.

`resolveComposerSuggestions(trigger, suggestions)` owns trigger-aware matching of a
product-configured suggestion catalog. React menu lifecycle and atom projection live in
`@interactive-os/json-document-composer-react`.
