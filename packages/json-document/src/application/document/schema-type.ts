export interface JSONDocumentSchemaLike {
  readonly _zod: {
    readonly input: unknown;
    readonly output: unknown;
  };
  safeParse(value: unknown): { success: true; data: unknown } | { success: false; error: unknown };
}

export type JSONDocumentSchemaInput<S> =
  S extends { readonly _zod: { readonly input: infer Input } }
    ? Input
    : unknown;

export type JSONDocumentSchemaOutput<S> =
  S extends { readonly _zod: { readonly output: infer Output } }
    ? Output
    : unknown;
