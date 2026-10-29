import type {HTMLAttributes, ReactNode} from "react";
import {Check} from "./input-controls.js";
import {contentPresentation} from "./content-presentation.js";

export interface TagOption {readonly id:string; readonly label:string; readonly disabled?:boolean;}
/** A category label is content, not a state badge or a button. */
export function Tag({children, ...attributes}: HTMLAttributes<HTMLSpanElement>): ReactNode {
  return <span {...attributes} data-ui-component="tag">{children}</span>;
}
export function TagGroup({label,items,emptyLabel="분류 없음"}: {readonly label:string; readonly items:readonly TagOption[]; readonly emptyLabel?:string}): ReactNode {
  return items.length ? <ul aria-label={label} data-ui-component="tag-group">{items.map(item=><li key={item.id}><Tag>{item.label}</Tag></li>)}</ul> : <span className={contentPresentation.caption}>{emptyLabel}</span>;
}
/** Multiple membership uses existing checkbox behavior; selected IDs never become display labels. */
export function TagPicker({label,options,value,onValueChange,disabled}: {readonly label:string; readonly options:readonly TagOption[]; readonly value:readonly string[]; readonly onValueChange:(value:readonly string[])=>void; readonly disabled?:boolean}): ReactNode {
  return <fieldset data-ui-component="tag-picker" disabled={disabled}><legend className={contentPresentation.caption}>{label}</legend><div>{options.map(option=><label key={option.id}><Check label={option.label} disabled={disabled || option.disabled} checked={value.includes(option.id)} onCheckedChange={checked=>onValueChange(checked ? [...value,option.id] : value.filter(id=>id!==option.id))}/><Tag>{option.label}</Tag></label>)}</div></fieldset>;
}
