import { ActionLink } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { pageDescriptor } from "../../app/page-descriptors";

const demos = [
  {
    ...pageDescriptor("/demo"),
    kind: "document" as const,
    illustration: "sleep" as const,
  },
  {
    ...pageDescriptor("/demo/sheet"),
    kind: "sheet" as const,
    illustration: "cursor" as const,
  },
  {
    ...pageDescriptor("/demo/database"),
    kind: "database" as const,
    illustration: "peek" as const,
  },
] as const;

export function ShowcaseRoute() {
  return (
    <PageFrame>
      <PageHeader title="Demo Showcase" illustration="braces">
        See how the same headless editing contracts become three distinct products, then open any Demo and use it.
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-3">
        {demos.map((demo, index) => (
          <article key={demo.path} className={classes("flex min-h-[24rem] flex-col overflow-hidden", ui.surface.raised)}>
            <div className={classes("flex-1 p-5", index === 1 ? ui.surface.workspace : ui.surface.inset)}>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className={ui.text.label}>Complete editor</p>
                  <h2 className={classes("mb-2 mt-1", ui.text.title)}>{demo.label}</h2>
                </div>
                <img
                  src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/illustrations/petite-cats/${demo.illustration}.png`}
                  alt=""
                  aria-hidden="true"
                  className="h-16 w-16 object-contain"
                />
              </div>

              <ShowcasePreview kind={demo.kind} />
            </div>

            <div className="p-5">
              <p className={classes("mt-0", ui.text.body)}>{demo.description}</p>
              <ActionLink to={demo.path} kind="prominent">Open {demo.label} Demo</ActionLink>
            </div>
          </article>
        ))}
      </div>
    </PageFrame>
  );
}

function ShowcasePreview(props: { readonly kind: "document" | "sheet" | "database" }) {
  if (props.kind === "document") {
    return (
      <div className={classes("overflow-hidden p-2", ui.surface.raised)} aria-hidden="true">
        {["Write the first block", "Select a range", "Move it together"].map((text, index) => (
          <div
            key={text}
            className={classes(
              "grid grid-cols-[2rem_1fr] items-center",
              ui.surface.documentBlock,
              index === 1 && ui.surface.previewSelected,
            )}
            data-selected={index === 1 ? "true" : "false"}
          >
            <span className={classes("py-3 text-center", ui.surface.documentIndex, ui.text.meta)}>{index + 1}</span>
            <span className="px-3 py-3">{text}</span>
          </div>
        ))}
      </div>
    );
  }

  if (props.kind === "sheet") {
    return (
      <div className={classes("overflow-hidden", ui.surface.raised)} aria-hidden="true">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Task", "Status", "Owner"].map((heading) => (
                <th key={heading} className={classes("px-2 py-2 text-left", ui.surface.gridHead, ui.text.meta)}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[["Alpha", "Draft", "Mina"], ["Beta", "Ready", "Theo"], ["Gamma", "Review", "June"]].map((row, rowIndex) => (
              <tr key={row[0]}>
                {row.map((cell, columnIndex) => (
                  <td
                    key={cell}
                    className={classes("px-2 py-3", ui.surface.gridCell, ui.text.meta, rowIndex < 2 && columnIndex < 2 && ui.surface.previewSelected)}
                    data-selected={rowIndex < 2 && columnIndex < 2 ? "true" : "false"}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={classes("overflow-hidden", ui.surface.raised)} aria-hidden="true">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {[["Name", "title"], ["Status", "select"], ["Score", "number"]].map(([name, type]) => (
              <th key={name} className={classes("px-2 py-2 text-left", ui.database.head)}>
                <span className="block">{name}</span>
                <span className={ui.database.type}>{type}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[["Inbox", "Backlog", "8"], ["Review", "Doing", "5"], ["Ship", "Done", "13"]].map((row) => (
            <tr key={row[0]}>
              {row.map((cell) => <td key={cell} className={classes("px-2 py-3", ui.database.cell, ui.text.meta)}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
