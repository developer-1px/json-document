# Repository agent instructions

## Canonical module principle

This repository follows **the same role, the same responsibility, the same
canonical module** principle. Apply it to production code, packages, Hosts,
Demos, examples, adapters, connectors, and documentation.

### Decide modules by responsibility

- Determine a module from the role it performs and the responsibility it owns,
  not from its current file location or number of consumers.
- Code with the same role and the same responsibility MUST use one canonical
  module. Do not maintain parallel implementations for different consumers.
- A responsibility with one current consumer still MUST have a named module and
  an explicit boundary when it can be identified independently.
- If the canonical module cannot support a valid case, extend its canonical API
  instead of implementing a consumer-local bypass.
- If no canonical module owns the responsibility, create and register a module
  in the ecosystem at the responsibility's correct position.
- Treat duplicate or consumer-local implementations of a reusable
  responsibility as evidence that the ecosystem is incomplete.

Use this decision flow:

```text
same role + same responsibility
              |
              v
       canonical module exists? ---- no ---> create and register it
              |
             yes
              |
              v
       API supports the case? ------- no ---> extend the canonical API
              |
             yes
              |
              v
        consume the canonical API
```

### Host and Demo boundary

`Host` is a named ecosystem position, not an exemption from modularity. A Host
MAY own only:

- composition and execution order of canonical modules;
- product-specific policy values, permissions, and copy;
- fixtures and sample data;
- page layout and visual composition; and
- injection of concrete external-system instances.

A Host or Demo MUST NOT independently own document models, schemas, Intents,
commands, selection, history, gesture lifecycles, platform-event translation,
serialization, projections, or reusable UI behavior. Put each such
responsibility in its canonical module even when only one Host currently uses
it. Demo routes should expose fixtures, product copy, composition, and wiring;
they should demonstrate ecosystem APIs rather than substitute for them.

### Registration and public surface

When a responsibility becomes a shared or externally consumable contract, its
change is incomplete until all of the following exist at the canonical owner:

- a stable public API exported from the owning package;
- an API reference under that package's own documentation location;
- a site Usage example that imports and exercises the public API; and
- a source registration that links the Usage to the canonical implementation.

Do not create a detached API catalog that moves documentation away from its
owning module. Names and documentation navigation MUST make the responsibility
and its position discoverable.

### Smells and prohibited final owners

- `Etc`, `utils`, `helpers`, `common`, `misc`, and anonymous route-local code
  are not acceptable final owners for an identifiable responsibility.
- A site-shared helper is not sufficient when it implements a package-level or
  platform-level responsibility.
- A second implementation with equivalent intent is a module-boundary smell,
  even when its syntax, framework, or current consumer differs.
- A name that does not reveal the responsibility's ecosystem position is a
  naming or placement smell and requires an ownership review.
- Do not justify duplicate implementation with “only used here,” “Demo code,”
  “Host-specific,” or anticipated future cleanup.

Before adding behavior, search for the canonical responsibility and its public
API. Before finishing a change, audit the affected Demo or Host for equivalent
local behavior, confirm that Usage and source registration are visible on the
site, and verify that no arbitrary implementation remains.

## UI visual discipline

Default to omission. Before adding or keeping a visible element, answer in
order:

1. What product meaning, action, state, or hierarchy does it communicate?
2. Would removing it make that meaning unavailable or materially ambiguous?
3. Is another element already communicating the same thing?
4. Can typography, spacing, alignment, or an existing canonical primitive
   communicate it with less visual treatment?

Remove the element when its absence does not lose meaning. In particular:

- Do not add a wrapper, container, or card merely to group nearby content.
- Use a border only for a real boundary, interaction affordance, or state.
  Icon buttons are borderless by default; preserve hover and keyboard-focus
  feedback.
- Use a background only to distinguish a meaningful surface or state, and a
  shadow only when actual elevation or overlay position must be communicated.
- Do not add a role label when placement and presentation already make the
  role unambiguous.
- Do not express the same distinction repeatedly through text, icon, border,
  background, and shape. Keep the smallest sufficient combination.
- Reuse existing semantic tokens, Tailwind recipes, and canonical UI
  primitives before introducing a new visual concept.
- Minimize the number of alignment rules, content widths, radii, and surface
  treatments on one screen.

After implementing UI, audit it by subtraction: remove every treatment whose
absence preserves information, behavior, state, hierarchy, and accessibility.
When uncertain, present the simpler version first.
