import { adapterCatalog } from "./adapter-catalog";
import { InlineCode } from "../../shared/ui/code-block";
import { ActionLink } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

export function AdapterCatalogRoute() {
  return (
    <PageFrame>
      <PageHeader illustration="peek" title="Adapters">
        Official platform adapters attach headless JSON Document and Editing to native input without changing those contracts.
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        {adapterCatalog.map((adapter) => (
          <article key={adapter.id} className={classes("flex min-h-44 flex-col py-4", ui.surface.sectionDivider)}>
            <div className="flex items-start justify-between gap-3">
              <h2 className={classes("m-0", ui.text.heading)}>{adapter.name}</h2>
              <span className={classes("px-2 py-1", ui.surface.inset, ui.text.label)}>
                {adapter.status}
              </span>
            </div>
            <InlineCode className="mt-2 block">{adapter.packageName}</InlineCode>
            <p className={classes("mb-4 mt-3", ui.text.body)}>{adapter.description}</p>
            <ActionLink to={adapter.demoPath} kind="prominent" className="mt-auto self-start">
              Open Live Demo
            </ActionLink>
          </article>
        ))}
      </div>
    </PageFrame>
  );
}
