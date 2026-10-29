import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Choice, type ChoiceOption } from "./choice.js";
import { Command } from "./controls.js";
import { Toolbar } from "./toolbar.js";
import { floatingSurface } from "./floating-surface.js";

/** Product owners supply bounded choices and commands; the primitive owns presentation. */
export interface EditingControlsProps {
  readonly label: string;
  readonly choices?: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly value: string;
    readonly options: ReadonlyArray<ChoiceOption>;
    readonly renderValue?: (option: ChoiceOption) => ReactNode;
    readonly renderOption?: (option: ChoiceOption) => ReactNode;
    readonly onValueChange: (value: string) => void;
  }>;
  readonly actions?: ReadonlyArray<{ readonly id: string; readonly label: string; readonly disabled?: boolean; readonly onSelect: () => void }>;
  readonly onRequestEdit?: () => void;
  readonly requestLabel?: string;
  readonly children?: ReactNode;
}

/** Minimal direct editing with an explicit handoff for open-ended changes. */
export function EditingControls({ label, choices = [], actions = [], onRequestEdit, requestLabel = "AI에게 수정 요청", children }: EditingControlsProps): ReactNode {
  return <Toolbar label={label} className={floatingSurface.control} data-ui-editing-controls="" style={{ flexWrap: "wrap", maxWidth: "100%" }}>
    {choices.map(choice => <Choice key={choice.id} presentation="popup" label={choice.label} value={choice.value} options={choice.options} onValueChange={choice.onValueChange} {...(choice.renderValue ? { renderValue: choice.renderValue } : {})} {...(choice.renderOption ? { renderOption: choice.renderOption } : {})} />)}
    {actions.map(action => <Command key={action.id} disabled={action.disabled} onClick={action.onSelect}>{action.label}</Command>)}
    {children}
    {onRequestEdit && <Command label={requestLabel} onClick={onRequestEdit}><Sparkles size={16} aria-hidden="true" /></Command>}
  </Toolbar>;
}
