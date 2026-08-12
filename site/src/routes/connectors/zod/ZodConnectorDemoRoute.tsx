import { ZodConnectorLab } from "./ZodConnectorLab";

const connectorCode = `const validate = createZodValidator(schema);
const document = createJSONDocument(initial, { validate });`;

export function ZodConnectorDemoRoute() {
  return (
    <main className="min-h-full bg-stone-50 px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 grid gap-4 border-b border-stone-200 pb-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-stone-400">Connector Live Demo</p>
            <h1 className="mb-2 mt-1 text-3xl font-semibold text-stone-950">Zod Connector</h1>
            <p className="m-0 max-w-2xl text-sm leading-6 text-stone-600">
              Zod safeParse issues translated into JSON Document validation results and JSON Pointer diagnostics.
            </p>
          </div>
          <div className="rounded border border-stone-200 bg-white p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Install</div>
            <code className="mt-2 block overflow-x-auto text-xs text-stone-700">npm i @interactive-os/json-document-zod zod</code>
          </div>
        </header>

        <ZodConnectorLab />

        <section aria-label="Minimal Zod connector code" className="mt-4 rounded border border-stone-200 bg-white p-4">
          <h2 className="mb-2 mt-0 text-sm font-semibold text-stone-950">The connection</h2>
          <pre className="m-0 overflow-x-auto rounded bg-stone-950 p-3 text-xs leading-5 text-stone-100"><code>{connectorCode}</code></pre>
          <p className="mb-0 mt-3 text-xs leading-5 text-stone-500">
            The Connector owns validation result translation only. Forms, schema-driven UI, and canonical normalization remain explicit host concerns.
          </p>
        </section>
      </div>
    </main>
  );
}
