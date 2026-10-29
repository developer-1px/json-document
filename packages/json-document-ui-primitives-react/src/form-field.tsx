import {useId, type ReactNode} from "react";
import {AlertCircle} from "lucide-react";
import {contentPresentation} from "./content-presentation.js";

export interface FormFieldControlProps {
  readonly id: string;
  readonly required: boolean;
  readonly "aria-describedby"?: string;
  readonly "aria-invalid"?: true;
}
export interface FormFieldProps {
  readonly id?: string;
  readonly label: string;
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly required?: boolean;
  readonly children: (control: FormFieldControlProps) => ReactNode;
}
/** One labelled input and its help/error association. Validation and save policy stay with the value owner. */
export function FormField({id, label, description, error, required = false, children}: FormFieldProps): ReactNode {
  const generatedId = useId();
  const controlId = id ?? `field-${generatedId}`;
  const describedBy = [description ? `${controlId}-description` : "", error ? `${controlId}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <div data-ui-component="form-field" data-invalid={error ? "true" : undefined}>
    <label htmlFor={controlId} data-form-field="label">{label}{required && <span aria-hidden="true"> *</span>}</label>
    {children({id: controlId, required, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined})}
    {description && <p id={`${controlId}-description`} className={contentPresentation.caption}>{description}</p>}
    {error && <p id={`${controlId}-error`} role="status" data-form-field="error" className={contentPresentation.caption}><AlertCircle size={16} aria-hidden="true"/>{error}</p>}
  </div>;
}
