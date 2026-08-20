import { integrationPageDescriptors } from "../../app/page-descriptors";
import { InlineCode } from "../../shared/ui/code-block";
import { ActionLink } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

export function AdapterCatalogRoute() {
  return (
    <PageFrame>
      <PageHeader illustration="peek" title="Adapter">
        Official platform adapters attach headless JSON Document and Editing to native input without changing those contracts.
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        {integrationPageDescriptors("adapter").map((adapter) => (
          <article key={adapter.path} className="flex min-h-44 flex-col py-4">
            <h2 className={classes("m-0", ui.text.heading)}>{adapter.label}</h2>
            <InlineCode className="mt-2 block">{adapter.integration!.packageName}</InlineCode>
            <p className={classes("mb-4 mt-3", ui.text.body)}>{adapter.description}</p>
            <ActionLink to={adapter.path} kind="prominent" className="mt-auto self-start">
              Open Live Demo
            </ActionLink>
          </article>
        ))}
      </div>
    </PageFrame>
  );
}
