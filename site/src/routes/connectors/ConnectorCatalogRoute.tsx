import { connectorCatalog } from "./connector-catalog";
import { InlineCode } from "../../shared/ui/code-block";
import { PageIntro } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function ConnectorCatalogRoute() {
  return (
    <main className={classes("px-4 py-8 lg:px-8", ui.frame.page)}>
      <div className="mx-auto max-w-5xl">
        <header className={classes("mb-7 pb-5", ui.frame.header)}>
          <PageIntro illustration="peek" title="Connectors">
            Optional packages that translate ecosystem-native contracts without changing the JSON Document Kernel.
          </PageIntro>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {connectorCatalog.map((connector) => (
            <article key={connector.id} className={classes("flex min-h-44 flex-col py-4", ui.surface.sectionDivider)}>
              <div className="flex items-start justify-between gap-3">
                <h2 className={classes("m-0", ui.text.heading)}>{connector.name}</h2>
                <span className={classes("px-2 py-1", ui.surface.inset, ui.text.label)}>
                  {connector.status}
                </span>
              </div>
              <InlineCode className="mt-2 block">{connector.packageName}</InlineCode>
              <p className={classes("mb-4 mt-3", ui.text.body)}>{connector.description}</p>
              {connector.demoPath === null ? (
                <span className={classes("mt-auto", ui.text.meta)}>Live Demo ships with the implementation.</span>
              ) : (
                <a
                  className={classes("mt-auto self-start", ui.action.primary)}
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
