import { createContext, useContext, type ButtonHTMLAttributes, type ReactNode } from "react";
import { classes, ui } from "./styles";

const PageLeadContext = createContext<ReactNode>(null);

export function PageLeadProvider(props: {
  readonly lead: ReactNode;
  readonly children: ReactNode;
}) {
  return <PageLeadContext.Provider value={props.lead}>{props.children}</PageLeadContext.Provider>;
}

export type PetiteCatIllustration = "sleep" | "peek" | "braces" | "cursor";

export function PageFrame(props: { readonly children: ReactNode }) {
  const lead = useContext(PageLeadContext);
  return (
    <main className={ui.frame.page}>
      <div className={ui.frame.content} data-page-frame>
        {lead}
        {props.children}
      </div>
    </main>
  );
}

export function PageHeader(props: {
  readonly label?: ReactNode;
  readonly title: ReactNode;
  readonly children?: ReactNode;
  readonly illustration?: PetiteCatIllustration;
  readonly aside?: ReactNode;
}) {
  return (
    <header className={ui.pageHeader.root} data-page-header>
      <div className={classes(ui.pageHeader.layout, props.aside != null && ui.pageHeader.layoutWithAside)}>
        <div className={classes(ui.pageHeader.copy, props.illustration && ui.pageHeader.copyWithArtwork)}>
          {props.label ? <p className={classes("mb-2 mt-0", ui.text.label)}>{props.label}</p> : null}
          <h1 className={classes(props.children ? "mb-2" : "mb-0", "mt-0", ui.text.title)}>{props.title}</h1>
          {props.children ? <p className={`m-0 max-w-2xl ${ui.text.body}`}>{props.children}</p> : null}
          {props.illustration ? (
            <figure className={ui.pageHeader.artwork} aria-hidden="true" data-petite-cat={props.illustration}>
              <img
                alt=""
                className={ui.pageHeader.image}
                src={sitePath(`/illustrations/petite-cats/${props.illustration}.png`)}
              />
            </figure>
          ) : null}
        </div>
        {props.aside ? <div className={ui.pageHeader.aside}>{props.aside}</div> : null}
      </div>
    </header>
  );
}

function sitePath(path: string): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${basePath}${path}` || "/";
}

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly kind?: "primary" | "secondary" | "toggle";
}) {
  const { className, kind = "secondary", type = "button", ...buttonProps } = props;
  return <button {...buttonProps} type={type} className={classes(className, ui.action[kind])} />;
}
