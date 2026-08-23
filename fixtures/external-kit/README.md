# External Database Hand fixture

This fixture is outside the repository workspaces. The verifier copies it into
an empty project, installs real npm tarballs, typechecks, builds, and drives an
admin in a browser.

The host imports only `@interactive-os/json-document-database`, its stylesheet,
React, and Zod. Branding and a status cell renderer belong to the host; grid
semantics and editing behavior belong to the Hand. Repository source paths and
`workspace:` resolutions invalidate the proof.
