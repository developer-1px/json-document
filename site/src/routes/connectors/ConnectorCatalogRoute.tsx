import { connectorCatalog } from "./connector-catalog";
import { InlineCode } from "../../shared/ui/code-block";
import { ActionLink } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

export function ConnectorCatalogRoute() {
  return (
    <PageFrame>
        <PageHeader illustration="peek" title="Connectors">
            Optional packages that connect external tools without changing the JSON Document and Editing contracts.
        </PageHeader>

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
                <div className="mt-auto flex flex-wrap items-center gap-3">
                  <ActionLink to={connector.demoPath} kind="prominent" className="self-start">
                    Open Live Demo
                  </ActionLink>
                  {connector.moreDemos?.map((demo) => (
                    <ActionLink key={demo.path} to={demo.path}>
                      {demo.label}
                    </ActionLink>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
    </PageFrame>
  );
}
