import type {HTMLAttributes, ReactNode} from "react";
import {contentPresentation} from "./content-presentation.js";
export interface ContentCardProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "children"> {readonly title?: ReactNode; readonly header?: ReactNode; readonly children?: ReactNode; readonly actions?: ReactNode; readonly empty?: ReactNode; readonly boundary?: "outline" | "surface";}
/** A genuinely independent content unit, not a decoration for every section. */
export function ContentCard({title, header, children, actions, empty, boundary = "outline", ...attributes}: ContentCardProps): ReactNode {
  return <article {...attributes} data-ui-component="content-card" data-boundary={boundary}>{header ?? (title != null && <header><h2 className={contentPresentation.heading}>{title}</h2></header>)}<div data-card-region="body">{children ?? empty}</div>{actions && <footer data-card-region="actions">{actions}</footer>}</article>;
}
