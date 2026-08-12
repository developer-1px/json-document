# @interactive-os/json-document-react-hook-form

React Hook Form lifecycle translation for `json-document` editing sessions.

```tsx
const binding = useJSONDocumentForm<ProfileForm, FormSelection>(session, {
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

## Install

```sh
npm i @interactive-os/json-document-react-hook-form react-hook-form react
```
