import { createContext, useContext, type ReactNode } from "react";
import { PageHeader as SharedPageHeader } from "@interactive-os/json-document-ui-primitives-react";
import { ui } from "./styles";

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

export function PageHeader(props: {
  readonly label?: ReactNode;
  readonly title: ReactNode;
  readonly children?: ReactNode;
  readonly illustration?: PetiteCatIllustration;
  readonly aside?: ReactNode;
}) {
  const lead = useContext(PageLeadContext);
  return (
    <div className="grid min-w-0 gap-related" data-site-page-header>
      {lead}
      <SharedPageHeader
        title={props.title}
        titleRole="primary"
        identifier={props.label}
        description={props.children}
        actions={props.aside}
        artwork={props.illustration ? <img alt="" data-petite-cat={props.illustration} src={sitePath(`/illustrations/petite-cats/${props.illustration}.png`)} /> : undefined}
      />
    </div>
  );
}

function sitePath(path: string): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${basePath}${path}` || "/";
}
