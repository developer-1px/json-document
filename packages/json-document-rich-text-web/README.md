# @interactive-os/json-document-rich-text-web

Official DOM Selection, contenteditable, semantic HTML, and multi-representation Clipboard integration for `@interactive-os/json-document-rich-text`.

`createRichTextContentEditableBinding` maps native `beforeinput` to official
text, block, mark, node, IME, deletion, history, and clipboard intents. DOM
Selection round-trips both text offsets and container child boundaries. Copy,
cut, and paste publish/consume structured Rich Text, safe semantic HTML, and
plain text in that priority order.

HTML syntax is read through Web's `parseWebHTMLFragment`, an inert template parser
shared with Canvas and Composer intake. Active and foreign content is excluded;
returned nodes are never inserted into a live document. Rich Text Web still owns
schema-specific block/mark conversion. This profile does not add inline images.

Keyboard Undo/Redo consumes the Web package's `createWebKeyboardAdapter` defaults
(`Mod-z`, `Mod-Shift-z`). This binding retains its historical Alt variants through
explicit keymap entries. Root ownership and composition handling stay in this
binding. [Keyboard history tests](tests/history-keyboard.test.ts) exercise native
range replacement and meta/control Undo/Redo, including backward ranges and
selection movement after Undo without losing Redo. These synthetic DOM cases
complement the Rich Text demo's real-browser input tests.

IME composition uses a DOM reconciliation lease rather than inserting
`compositionend.data` directly. The binding captures the canonical selection
and pre-composition DOM text, lets the platform mutate the active DOM while
`isComposing()` is true, and commits the final DOM text diff once with one
EditingSession history group. Non-collapsed iOS deletion target ranges are
honored for Korean keyboards that do not emit composition events.

Hosts that render the same document should use `onCompositionChange` to hold
document reconciliation while the platform owns the composing DOM. The
official React surface does this automatically.

The Web package does not store canonical state in DOM and does not define
product keyboard or toolbar policy.

Nested form controls and separate editing hosts never dispatch outer-editor
commands. This revision uses the Web peer's `isWebEditingHostTarget` capability.
Replacement, yank, and transpose input accept both `data` and a `text/plain`
`dataTransfer` representation, using the supplied target ranges.

If a composition endpoint's canonical node changes or disappears during its
lease, the binding reports `rich-text.composition-stale` through `onAction`,
does not insert against the stale selection, and releases rendering through
`onCompositionChange(false)`. Changes outside those endpoints may still commit.
This is fail-closed recovery, not collaborative semantic selection mapping.
