/** Input policy is independent of the document format and its embedding environment. */
export interface GridEditingProfile {
  readonly enter: "edit" | "move";
  /** Existing-content activation (F2/double click); replacement typing always places the caret at the end. */
  readonly editSelection: "all" | "end";
}
export const gridEditingProfiles: Readonly<Record<"document-table" | "spreadsheet-grid" | "spreadsheet-mac", GridEditingProfile>> = {
  "document-table": {enter:"edit",editSelection:"all"},
  "spreadsheet-mac": {enter:"edit",editSelection:"all"},
  "spreadsheet-grid": {enter:"move",editSelection:"all"},
};

/** Replacement typing and existing-content editing have distinct initial caret contracts. */
export function resolveGridEditActivation(profile: GridEditingProfile, existingText: string, replacementText?: string): {draft: string; initialSelection: "all" | "end"} {
  return {draft:replacementText ?? existingText,initialSelection:replacementText === undefined ? profile.editSelection : "end"};
}
