import { connectorCatalog } from "./connector-catalog";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function ConnectorCatalogRoute() {
  return (
    <main className="min-h-full bg-stone-50 px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7 border-b border-stone-200 pb-5">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-stone-400">Official integrations</p>
          <h1 className="mb-2 mt-1 text-3xl font-semibold text-stone-950">Connectors</h1>
          <p className="m-0 max-w-2xl text-sm leading-6 text-stone-600">
            Optional packages that translate ecosystem-native contracts without changing the JSON Document Kernel.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {connectorCatalog.map((connector) => (
            <article key={connector.id} className="flex min-h-44 flex-col rounded border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="m-0 text-base font-semibold text-stone-950">{connector.name}</h2>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  {connector.status}
                </span>
              </div>
              <code className="mt-2 block text-xs text-stone-500">{connector.packageName}</code>
              <p className="mb-4 mt-3 text-sm leading-6 text-stone-600">{connector.description}</p>
              {connector.demoPath === null ? (
                <span className="mt-auto text-xs text-stone-400">Live Demo ships with the implementation.</span>
              ) : (
                <a
                  className="mt-auto self-start rounded bg-stone-950 px-3 py-2 text-xs font-medium text-white no-underline hover:bg-stone-800"
                  href={sitePath(connector.demoPath)}
                >
                  Open Live Demo
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function sitePath(path: string): string {
  return `${basePath}${path}` || "/";
}
