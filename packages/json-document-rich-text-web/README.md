# @interactive-os/json-document-rich-text-web

Official DOM Selection, contenteditable, semantic HTML, and multi-representation Clipboard integration for `@interactive-os/json-document-rich-text`.

`createRichTextContentEditableBinding` maps native `beforeinput` to official
text, block, mark, node, IME, deletion, history, and clipboard intents. DOM
Selection round-trips both text offsets and container child boundaries. Copy,
cut, and paste publish/consume structured Rich Text, safe semantic HTML, and
plain text in that priority order.

The Web package does not store canonical state in DOM and does not define
product keyboard or toolbar policy.
