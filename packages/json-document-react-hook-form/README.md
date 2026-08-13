# @interactive-os/json-document-react-hook-form

React Hook Form lifecycle translation for shared `JSONDocument` instances.

```tsx
const binding = useReactHookFormConnector<ProfileForm>(document, {
  errorName: (failure) => failure.pointer === "/profile/title"
    ? "profile.title"
    : "root.canonical",
});

return <form onSubmit={binding.submit}>...</form>;
```

## Contract

- React Hook Form owns draft values, dirty/touched state, field registration, and field errors.
- A valid submit replaces the canonical JSON in one editing transaction and therefore one undo step.
- Rejected canonical validation preserves both the document and its history. `errorName` may translate a JSON Pointer diagnostic into a product field name; otherwise the error is reported at `root.canonical`.
- Every canonical value change, including undo, redo, and external commits, calls React Hook Form `reset` with a cloned object value.
- Selection-only changes do not reset the form.

The Connector requires object-shaped canonical JSON. It does not generate fields, own product schemas, validate drafts, or persist remote data.

`useJSONDocumentForm(session, options)` remains available as the lower-level
session binding. The official Connector entry point accepts `JSONDocument`
first and owns its form editing session internally.

## Install

```sh
npm i @interactive-os/json-document-react-hook-form react-hook-form react
```
