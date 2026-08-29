import type { ReactNode } from "react";
import { InlineChoice, type InlineChoiceOption } from "./controls.js";
import { PopupChoice, type PopupChoiceClassNames } from "./select.js";

export type ChoiceOption<Id extends string = string> = InlineChoiceOption<Id>;

export type ChoiceClassNames = PopupChoiceClassNames;

export type ChoiceProps<Id extends string = string> = {
  readonly label: string;
  readonly value: Id;
  readonly options: ReadonlyArray<ChoiceOption<Id>>;
  readonly onValueChange: (value: Id) => void;
} & (
  | { readonly presentation: "inline"; readonly className?: string }
  | {
      readonly presentation: "popup";
      readonly id?: string;
      readonly renderValue?: (option: ChoiceOption<Id>) => ReactNode;
      readonly renderOption?: (option: ChoiceOption<Id>) => ReactNode;
      readonly classNames?: ChoiceClassNames;
      readonly disabled?: boolean;
    }
);

/** Chooses exactly one value. Inline and popup presentations share one semantic role. */
export function Choice<Id extends string>(props: ChoiceProps<Id>): ReactNode {
  if (props.presentation === "inline") {
    return <InlineChoice {...props} />;
  }
  return <PopupChoice {...props} />;
}
