import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { ActionLink } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes } from "../../shared/ui/styles";
import { pageDescriptor } from "../../app/page-descriptors";
import { contentInteractionAttributes } from "@interactive-os/json-document-ui-primitives-react";

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

      <div className="grid gap-group xl:grid-cols-3">
        {demos.map((demo, index) => (
          <article key={demo.path} className={classes("flex min-h-[24rem] flex-col overflow-hidden")}>
            <div className={"grid content-start gap-group flex-1 p-group"}>
              <div className="flex items-start justify-between gap-group">
                <div className="grid content-start gap-related">
                  <p className={contentPresentation.caption}>Complete editor</p>
                  <h2 className={classes("m-0", contentPresentation.itemTitle)}>{demo.label}</h2>
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

            <div className="grid content-start gap-group p-group">
              <p className={classes("mt-0", contentPresentation.itemSummary)}>{demo.description}</p>
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
      <div className={classes("overflow-hidden p-related")} aria-hidden="true">
        {["Write the first block", "Select a range", "Move it together"].map((text, index) => (
          <div
            key={text}
            className={classes(
              "grid grid-cols-[2rem_1fr] items-center",
              contentPresentation.itemSummary,
            )}
            {...contentInteractionAttributes({ role: "content", selected: index === 1 })}
          >
            <span className={classes("py-related text-center", contentPresentation.caption, contentPresentation.caption)}>{index + 1}</span>
            <span className="px-related py-related">{text}</span>
          </div>
        ))}
      </div>
    );
  }

  if (props.kind === "sheet") {
    return (
      <div className={classes("overflow-hidden")} aria-hidden="true">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Task", "Status", "Owner"].map((heading) => (
                <th key={heading} className={classes("px-related py-related text-left", contentPresentation.tableHead, contentPresentation.caption)}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[["Alpha", "Draft", "Mina"], ["Beta", "Ready", "Theo"], ["Gamma", "Review", "June"]].map((row, rowIndex) => (
              <tr key={row[0]}>
                {row.map((cell, columnIndex) => (
                  <td
                    key={cell}
                    className={classes("px-related py-related", contentPresentation.tableCell, contentPresentation.caption)}
                    {...contentInteractionAttributes({ role: "content", selected: rowIndex < 2 && columnIndex < 2 })}
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
    <div className={classes("overflow-hidden")} aria-hidden="true">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {[["Name", "title"], ["Status", "select"], ["Score", "number"]].map(([name, type]) => (
              <th key={name} className={classes("px-related py-related text-left", contentPresentation.tableHead)}>
                <span className="block">{name}</span>
                <span className={contentPresentation.caption}>{type}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[["Inbox", "Backlog", "8"], ["Review", "Doing", "5"], ["Ship", "Done", "13"]].map((row) => (
            <tr key={row[0]}>
              {row.map((cell) => <td key={cell} className={classes("px-related py-related", contentPresentation.tableCell, contentPresentation.caption)}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
