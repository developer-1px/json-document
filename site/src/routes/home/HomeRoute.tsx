import { InlineCode } from "../../shared/ui/code-block";
import { ActionLink } from "../../shared/ui/interactive";
import { ui } from "../../shared/ui/styles";
import { homeStyles } from "./home-styles";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

function sitePath(path: string): string {
  return `${BASE_PATH}${path}` || "/";
}

export function HomeRoute() {
  return (
    <main className={homeStyles.page}>
      <section className={homeStyles.hero} aria-labelledby="home-title">
        <div className={homeStyles.copy}>
          <h1 id="home-title" className={homeStyles.logoHeading}>
            <span className="sr-only">json-document</span>
            <HomeWordmark />
          </h1>
          <p className={homeStyles.statement}>
            One JSON document. Any editor.
          </p>
          <p className={homeStyles.description}>
            A tiny headless API to read, query, patch, and subscribe.
          </p>

          <div className={homeStyles.entry}>
            <InlineCode className={homeStyles.install} prompt>npm i @interactive-os/json-document</InlineCode>
            <ActionLink to="/docs/tutorial" kind="prominent">Get started</ActionLink>
          </div>
        </div>

        <figure className={homeStyles.artwork}>
          <img
            className={homeStyles.artworkImage}
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

function HomeWordmark() {
  return (
    <svg
      aria-hidden="true"
      className={homeStyles.logo}
      viewBox="0 0 435 66"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
        <path d="M15 20v25c0 10-7 12-13 7" />
        <path d="M45 23c-4-6-16-5-17 3-1 5 5 6 10 7 6 1 10 4 8 9-3 7-16 7-20 1" />
        <path d="M61 30c0-9 5-14 13-14 10 0 15 6 15 15 0 11-6 17-15 17-9 0-13-7-13-18Z" />
        <path d="m64 20 2-8 7 6m7-1 7-6v11" />
        <path d="M101 47V21m0 9c4-8 10-11 16-8 5 2 6 6 6 13v12" />
        <path d="M192 8v39m-1-18c-3-8-11-10-16-5-6 6-5 18 2 22 7 4 14-2 14-11" />
        <path d="M206 34c0-9 4-14 12-14 9 0 13 6 13 14 0 9-5 14-13 14s-12-6-12-14Z" />
        <path d="M260 24c-9-7-18-1-18 10s9 17 19 10" />
        <path d="M272 21v17c0 8 4 11 10 10 6-1 10-8 10-15V21m0 0v26" />
        <path d="M305 47V21m0 9c4-8 10-11 15-7 3 2 4 6 4 12v12m0-16c4-9 10-11 15-7 3 3 3 7 3 13v10" />
        <path d="M369 42c-6 8-18 7-20-5-2-10 5-18 13-17 8 1 10 11 6 15l-18 1" />
        <path d="M380 47V21m0 9c4-8 10-11 16-8 5 2 6 6 6 13v12" />
        <path d="M417 10v28c0 8 4 11 10 8m-17-23h18" />
      </g>
      <g fill="currentColor">
        <circle cx="15" cy="9" r="2.5" />
        <circle cx="70" cy="31" r="1.7" />
        <circle cx="80" cy="30" r="1.7" />
      </g>
      <path className={ui.accent.impact.stroke} d="M137 34c7-1 14 0 21-1" fill="none" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}
