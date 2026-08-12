import { PageIntro } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const modelRows = [
  ["patch", "stateless JSON Patch application"],
  ["document", "value, at, query, validatePatch, commit, subscribe"],
  ["validation", "optional implementation-neutral candidate validation"],
  ["editing", "optional headless selection, clipboard, history, transactions"],
  ["host", "rendering, focus, persistence, and platform bridges"],
] as const;

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

function sitePath(path: string): string {
  return `${BASE_PATH}${path}` || "/";
}

export function HomeRoute() {
  return (
    <main className={ui.frame.page}>
      <section className={ui.frame.hero}>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:py-14">
          <div>
            <PageIntro label="Implementation-neutral JSON editing" title="json-document">
              A headless JSON API and six-member JSON Document for
              documents, tables, slides, canvases, and notes.
            </PageIntro>
            <div className="mt-6 flex flex-wrap gap-2">
              <a className={ui.action.primary} href={sitePath("/docs/tutorial")}>
                Quickstart
              </a>
              <a className={ui.action.secondary} href={sitePath("/docs")}>
                Concepts
              </a>
              <a className={ui.action.secondary} href={sitePath("/docs/api")}>
                API Reference
              </a>
              <a className={ui.action.secondary} href={sitePath("/demo")}>
                Document
              </a>
              <a className={ui.action.secondary} href={sitePath("/connectors")}>
                Connectors
              </a>
              <a className={ui.action.secondary} href="https://www.npmjs.com/package/@interactive-os/json-document">
                npm
              </a>
              <a className={ui.action.secondary} href="https://github.com/developer-1px/json-document">
                GitHub
              </a>
            </div>
          </div>

          <div className={classes("p-4", ui.surface.raised)}>
            <div className={classes("mb-2", ui.text.label)}>Release</div>
            <pre className={classes("m-0 overflow-x-auto", ui.code.block)}><code>3.0.0</code></pre>
            <div className={classes("mt-4 pt-3", ui.surface.divider, ui.text.label)}>Start</div>
            <pre className={classes("m-0 mt-2 overflow-x-auto", ui.code.block)}><code>{`import { createJSONDocument } from "@interactive-os/json-document";`}</code></pre>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <h2 className={classes("mb-3 mt-0", ui.text.heading)}>Public model</h2>
          <div className={classes("overflow-x-auto", ui.surface.raised)}>
            <table className={classes("w-full min-w-[34rem]", ui.surface.table)}>
              <thead>
                <tr>
                  <th className={classes("px-3 py-2", ui.surface.tableHead, ui.text.heading)}>Surface</th>
                  <th className={classes("px-3 py-2", ui.surface.tableHead, ui.text.heading)}>Responsibility</th>
                </tr>
              </thead>
              <tbody>
                {modelRows.map(([surface, responsibility]) => (
                  <tr key={surface}>
                    <td className={classes("px-3 py-2", ui.surface.tableCell)}>
                      <code className={ui.code.inline}>{surface}</code>
                    </td>
                    <td className={classes("px-3 py-2", ui.surface.tableCell, ui.text.body)}>{responsibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className={classes("pt-4", ui.surface.sectionDivider)}>
          <h2 className={classes("mb-3 mt-0", ui.text.heading)}>Boundary</h2>
          <ul className={classes("m-0 grid gap-2 p-0 [list-style:none]", ui.text.body)}>
            <li>Root Kernel is React- and Zod-free.</li>
            <li>Official Connectors add ecosystem-native integration without changing the Kernel.</li>
            <li>Headless editing is an optional companion composed over the six-member document.</li>
            <li>Mutation inputs are JSON Patch with JSON Pointer paths.</li>
            <li>JSONPath is search-only and returns pointers.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
