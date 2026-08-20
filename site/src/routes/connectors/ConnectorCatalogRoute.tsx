import { integrationPageDescriptors, pageDescriptors } from "../../app/page-descriptors";
import { InlineCode } from "../../shared/ui/code-block";
import { ActionLink } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

export function ConnectorCatalogRoute() {
  return (
    <PageFrame>
        <PageHeader illustration="connector" title="Connector">
            Optional packages that connect external tools without changing the JSON Document and Editing contracts.
        </PageHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {integrationPageDescriptors("connector").map((connector) => (
            <article key={connector.path} className="flex min-h-44 flex-col py-4">
              <h2 className={classes("m-0", ui.text.heading)}>{connector.label}</h2>
              <InlineCode className="mt-2 block">{connector.integration!.packageName}</InlineCode>
              <p className={classes("mb-4 mt-3", ui.text.body)}>{connector.description}</p>
              <div className="mt-auto flex flex-wrap items-center gap-3">
                <ActionLink to={connector.path} kind="prominent" className="self-start">
                  Open Live Demo
                </ActionLink>
                {pageDescriptors.filter((demo) => demo.parentPath === connector.path).map((demo) => (
                  <ActionLink key={demo.path} to={demo.path}>
                    {demo.relatedDemoLabel ?? demo.label}
                  </ActionLink>
                ))}
              </div>
            </article>
          ))}
        </div>
    </PageFrame>
  );
}
