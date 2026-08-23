# External npm kit fixture

This fixture is intentionally outside the repository workspaces. The verification
script copies it into an empty temporary project, installs five real package
tarballs plus React, then typechecks, builds, and drives the consumer-owned UI in
a browser.

It must import only public package names. Repository source paths and `workspace:`
resolutions invalidate the proof.

The fixture exercises:

- `@interactive-os/json-document` as the canonical document;
- `@interactive-os/json-document-selection` as the DOM-free selection contract;
- `@interactive-os/json-document-editing` for editing and history;
- `@interactive-os/json-document-web` for keyboard and structured clipboard;
- `@interactive-os/json-document-react` for the subscription bridge.
