import { createContext, useContext, type ReactNode } from "react";
import { classes, ui } from "./styles";

const PageLeadContext = createContext<ReactNode>(null);
const PageFrameContext = createContext(false);

export function PageLeadProvider(props: {
  readonly lead: ReactNode;
  readonly children: ReactNode;
}) {
  return <PageLeadContext.Provider value={props.lead}>{props.children}</PageLeadContext.Provider>;
}

export type PetiteCatIllustration =
  | "sleep"
  | "peek"
  | "braces"
  | "cursor"
  | "terminal"
  | "branch"
  | "clipboard"
  | "connector"
  | "debug"
  | "package"
  | "database"
  | "patch";

export function PageFrame(props: { readonly children: ReactNode }) {
  if (useContext(PageFrameContext)) return props.children;
  return (
    <PageFrameContext.Provider value={true}>
      <main className={ui.frame.page}>
        <div className={ui.frame.content} data-page-frame>
          {props.children}
        </div>
      </main>
    </PageFrameContext.Provider>
  );
}

export function ProductApp(props: {
  readonly toolbar?: ReactNode;
  readonly toolbarLabel?: string;
  readonly inspector?: ReactNode;
  readonly canvasClassName?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className={ui.product.frame} data-product-app>
      {props.toolbar != null ? (
        <div className={ui.product.toolbar} role="toolbar" aria-label={props.toolbarLabel}>
          {props.toolbar}
        </div>
      ) : null}
      <div className={classes(ui.product.canvas, props.canvasClassName)}>{props.children}</div>
      {props.inspector != null ? <div className={ui.product.panel}>{props.inspector}</div> : null}
    </div>
  );
}

export function PageHeader(props: {
  readonly label?: ReactNode;
  readonly title: ReactNode;
  readonly children?: ReactNode;
  readonly illustration?: PetiteCatIllustration;
  readonly aside?: ReactNode;
}) {
  const lead = useContext(PageLeadContext);
  return (
    <header className={ui.pageHeader.root} data-page-header>
      {lead}
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
