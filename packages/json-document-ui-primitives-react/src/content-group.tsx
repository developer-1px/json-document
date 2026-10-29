import type {ReactNode} from "react";
import {contentPresentation} from "./content-presentation.js";
export type ContentRelationship = "related" | "group" | "region";
/** The common parent owns spacing. A boundary is composed with ContentCard or a divider. */
export function ContentGroup({label,relationship="group",children}: {readonly label?:string; readonly relationship?:ContentRelationship; readonly children:ReactNode}): ReactNode {
  return <section aria-label={label} data-ui-component="content-group" data-relationship={relationship} className={contentPresentation.group}>{children}</section>;
}
