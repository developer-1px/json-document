import { pageDescriptor } from "../../app/page-descriptors";
import { ActionLink } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const widgets = [
  {
    ...pageDescriptor("/widgets/toolbar"),
    affordance: "canUndo / canRedo",
  },
  {
    ...pageDescriptor("/widgets/listbox"),
    affordance: "selected keys / focus",
  },
  {
    ...pageDescriptor("/widgets/grid"),
    affordance: "topology / selected cells",
  },
] as const;

export function WidgetCatalogRoute() {
  return (
    <PageFrame>
      <PageHeader illustration="connector" title="Widgets">
        Bindings turn editing values into Toolbar, Listbox, and Grid props. The demos only render. Button and Card are not widgets.
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        {widgets.map((widget) => (
          <article key={widget.path} className="flex min-h-44 flex-col py-4">
            <p className={ui.text.label}>{widget.affordance}</p>
            <h2 className={classes("mb-2 mt-1", ui.text.heading)}>{widget.label}</h2>
            <p className={classes("mb-4 mt-0", ui.text.body)}>{widget.description}</p>
            <ActionLink to={widget.path} kind="prominent" className="mt-auto self-start">
              Open {widget.label}
            </ActionLink>
          </article>
        ))}
      </div>
    </PageFrame>
  );
}
