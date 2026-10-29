import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import type { ReactNode } from "react";
import { DemoPage } from "../demo-workbench/DemoPage";
import { CodeBlock } from "./code-block";
import type { CodeLanguage } from "./code-tokens";
import { PageHeader, type PetiteCatIllustration } from "./primitives";
import { classes, ui } from "./styles";

type ConnectionCode = {
  readonly language: CodeLanguage;
  readonly source: string;
};

export function CatalogDemoPage(props: {
  readonly title: string;
  readonly description: ReactNode;
  readonly illustration: PetiteCatIllustration;
  readonly install: string;
  readonly connectionCode: ConnectionCode | ReadonlyArray<ConnectionCode>;
  readonly connectionDescription?: ReactNode;
  readonly children: ReactNode;
}) {
  const codeBlocks = Array.isArray(props.connectionCode)
    ? props.connectionCode
    : [props.connectionCode];

  return (
    <DemoPage
      documentation={(
        <>
          <PageHeader
            illustration={props.illustration}
            title={props.title}
            aside={(
              <div className={classes(ui.code.install, "grid gap-related")}>
                <div className={contentPresentation.caption}>Install</div>
                <CodeBlock
                  
                  label="Install command"
                  language="shell"
                  linePrefix={<span aria-hidden="true" className={ui.code.prompt}>$ </span>}
                  size="compact"
                  source={props.install}
                />
              </div>
            )}
          >
            {props.description}
          </PageHeader>

          <section className="grid gap-related" aria-label={`Minimal ${props.title} code`} data-connector-connection>
            <h2 className={contentPresentation.itemTitle}>The connection</h2>
            {codeBlocks.map((block, index) => (
              <CodeBlock
                
                key={`${block.language}:${index}`}
                language={block.language}
                size="content"
                source={block.source}
              />
            ))}
            {props.connectionDescription ? (
              <p className={contentPresentation.caption}>{props.connectionDescription}</p>
            ) : null}
          </section>

          <p className={contentPresentation.caption}>Live demo</p>
        </>
      )}
    >
      <div data-connector-live-demo>{props.children}</div>
    </DemoPage>
  );
}
