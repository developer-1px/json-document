# @interactive-os/json-document-rich-text-web

Official DOM Selection, contenteditable, semantic HTML, and multi-representation Clipboard integration for `@interactive-os/json-document-rich-text`.

`createRichTextContentEditableBinding` maps native `beforeinput` to official
text, block, mark, node, IME, deletion, history, and clipboard intents. DOM
Selection round-trips both text offsets and container child boundaries. Copy,
cut, and paste publish/consume structured Rich Text, safe semantic HTML, and
plain text in that priority order.

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
