import { classes, ui } from "../../shared/ui/styles";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

function sitePath(path: string): string {
  return `${BASE_PATH}${path}` || "/";
}

export function HomeRoute() {
  return (
    <main className={ui.home.page}>
      <section className={ui.home.hero} aria-labelledby="home-title">
        <div className={ui.home.copy}>
          <p className={classes("mb-5 mt-0", ui.text.label)}>Headless JSON editing</p>
          <h1 id="home-title" className={ui.home.title}>json-document</h1>
          <p className={ui.home.statement}>
            One document model.
            <br />
            Any editor.
          </p>
          <p className={ui.home.description}>
            Read, query, validate, patch, and subscribe to JSON without choosing
            your renderer, framework, or schema library.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <a className={ui.action.primary} href={sitePath("/docs/tutorial")}>
              Get started
            </a>
            <a className={ui.action.secondary} href={sitePath("/docs/api")}>
              Read the API
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <code className={ui.home.install}>npm i @interactive-os/json-document</code>
            <span className={ui.text.meta}>v3.0.0</span>
          </div>
        </div>

        <figure className={ui.home.artwork}>
          <img
            className={ui.home.artworkImage}
            src={sitePath("/cat-enter.png")}
            alt="A small cat struggling to press an oversized Enter key."
            width="1200"
            height="800"
          />
        </figure>
      </section>
    </main>
  );
}
