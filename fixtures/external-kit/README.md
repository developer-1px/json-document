# External Database Hand fixture

This fixture is outside the repository workspaces. The verifier copies it into
an empty project, installs real npm tarballs, typechecks, builds, and drives an
admin in a browser.

The host imports only `@interactive-os/json-document-database`, its stylesheet,
React, and Zod. It connects a 240-row in-memory server through the public CRUD
operations contract and composes Provider, Record, View, Status, Table,
Pagination, and Detail Hands. The browser proves server projection, cursor
pagination, optimistic rollback, validation, saved views, host branding, and a
custom status renderer. Repository source paths and `workspace:` resolutions
invalidate the proof.
