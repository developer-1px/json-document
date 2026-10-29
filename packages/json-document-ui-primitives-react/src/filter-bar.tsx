import type {ReactNode} from "react";
import {Command} from "./controls.js";
import {Toolbar} from "./toolbar.js";
import {contentPresentation} from "./content-presentation.js";
export interface AppliedFilter {readonly id: string; readonly label: string;}
/** Applied conditions remain visible and removable; filtering itself belongs to the data owner. */
export function FilterBar({label, children, filters, onRemove, onReset, resultCount}: {readonly label: string; readonly children?: ReactNode; readonly filters: readonly AppliedFilter[]; readonly onRemove: (id: string) => void; readonly onReset: () => void; readonly resultCount?: number}): ReactNode {
  return <Toolbar label={label}><div data-ui-component="filter-bar">{children}{filters.map(filter => <Command key={filter.id} aria-label={`${filter.label} 필터 제거`} onClick={() => onRemove(filter.id)}>{filter.label} ×</Command>)}{filters.length > 0 && <Command onClick={onReset}>필터 초기화</Command>}{resultCount !== undefined && <span role="status" className={contentPresentation.caption}>{resultCount}개 결과</span>}</div></Toolbar>;
}
