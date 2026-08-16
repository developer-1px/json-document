import type { ReactNode } from "react";
import { CodeBlock, InlineCode } from "./code-block";
import type { CodeLanguage } from "./code-tokens";
import { PageFrame, PageHeader, type PetiteCatIllustration } from "./primitives";
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
    <PageFrame>
      <PageHeader
        illustration={props.illustration}
        title={props.title}
        aside={(
          <div className={ui.code.install}>
            <div className={ui.text.label}>Install</div>
            <InlineCode className="mt-2 block overflow-x-auto whitespace-nowrap" prompt>
              {props.install}
            </InlineCode>
          </div>
        )}
      >
        {props.description}
      </PageHeader>

      <section aria-label={`Minimal ${props.title} code`} data-connector-connection>
        <h2 className={classes("mb-2 mt-0", ui.text.heading)}>The connection</h2>
        {codeBlocks.map((block, index) => (
          <CodeBlock
            className={index === 0 ? undefined : "mt-3"}
            key={`${block.language}:${index}`}
            language={block.language}
            size="content"
            source={block.source}
          />
        ))}
        {props.connectionDescription ? (
          <p className={classes("mb-0 mt-3", ui.text.meta)}>{props.connectionDescription}</p>
        ) : null}
      </section>

      <div className={classes("mt-4 pt-4", ui.surface.sectionDivider)} data-connector-live-demo>
        <p className={classes("mb-3 mt-0", ui.text.label)}>Live demo</p>
        {props.children}
      </div>
    </PageFrame>
  );
}
