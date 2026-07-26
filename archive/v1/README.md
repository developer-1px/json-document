# Archived 1.x research

This directory preserves the unreleased 1.x editing session, framework
bindings, extension experiments, and product demos for historical reference.

Nothing under this directory is an npm workspace, publish target, public v2
entrypoint, CI compatibility promise, or generated public catalog source. The
v2 release graph contains only:

- `packages/json-document`: the provider-neutral JSON protocol and six-member
  document projection;
- `apps/site`: documentation for that protocol and its host-adapter boundary.

The archived code imports the removed
`@interactive-os/json-document/session` contract and is intentionally not
compatible with `@interactive-os/json-document@2`.
