# @interactive-os/json-document-ui-primitives-react API

**Owner:** UI Primitives

표준 React UI primitive의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-ui-primitives-react/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `Check`

```ts
Check(props: { readonly label: string; readonly checked: boolean; readonly onCheckedChange: (checked: boolean) => void; readonly disabled?: boolean; readonly className?: string; }): ReactNode
```
## `Choice`

```ts
Choice<Id extends string>(props: ChoiceProps<Id>): ReactNode
```
## `ChoiceClassNames`

```ts
type ChoiceClassNames = PopupChoiceClassNames;
```
## `ChoiceOption`

```ts
type ChoiceOption<Id extends string = string> = InlineChoiceOption<Id>;
```
## `ChoiceProps`

```ts
type ChoiceProps<Id extends string = string> = {
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
```
## `Command`

```ts
Command(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> & FocusPreservingControl & { readonly kind?: CommandKind; readonly label?: string; readonly rootClassName?: string; }): ReactNode
```
## `CommandKind`

```ts
type CommandKind = "primary" | "secondary" | "danger";
```
## `ContextualControls`

```ts
ContextualControls<Id extends string>(props: Omit<HTMLAttributes<HTMLDivElement>, "children"> & { readonly capabilities: ReadonlyArray<ContextualAffordanceCapability<Id>>; readonly selected?: boolean; readonly editing?: boolean; readonly children: (snapshot: ContextualAffordanceSnapshot<Id>) => ReactNode; }): ReactNode
```
## `ControlHandle`

```ts
ControlHandle(props: ControlHandleProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `ControlHandleProps`

```ts
type ControlHandleProps = Omit<InteractionHandleButtonProps<ControlHandleDescriptor>, "descriptor"> & {
  readonly descriptor?: ControlHandleDescriptor;
};
```
## `Dialog`

```ts
Dialog(props: { readonly label: string; readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly children: ReactNode; readonly className?: string; readonly presentation?: "modal" | "sheet"; }): ReactNode
```
## `DisclosureButton`

```ts
DisclosureButton(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-expanded" | "aria-controls"> & { readonly expanded: boolean; readonly controls: string; }): ReactNode
```
## `DragHandle`

```ts
DragHandle(props: DragHandleProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `DragHandleProps`

```ts
type DragHandleProps = Omit<InteractionHandleButtonProps<DragHandleDescriptor>, "descriptor"> & {
  readonly descriptor?: DragHandleDescriptor;
};
```
## `Field`

```ts
Field(props: { readonly label: string; readonly value: string; readonly onValueChange: (value: string) => void; readonly multiline?: boolean; readonly disabled?: boolean; readonly placeholder?: string; readonly className?: string; }): ReactNode
```
## `FileDropRegion`

```ts
FileDropRegion(props: Omit<HTMLAttributes<HTMLDivElement>, "onDrop"> & { readonly onFiles: (files: ReadonlyArray<File>) => void; readonly overlay?: ReactNode; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `GridCell`

```ts
GridCell(props: TdHTMLAttributes<HTMLTableCellElement> & { readonly selected: boolean; readonly focus?: boolean; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `InteractionHandleBindingOptions`

```ts
type InteractionHandleBindingOptions<ElementType extends Element = HTMLElement> = {
  readonly descriptor: InteractionHandleDescriptor;
  readonly onHandle: (event: InteractionHandleEvent, input: PointerEvent<ElementType>) => void;
};
```
## `InteractionHandleButtonProps`

```ts
type InteractionHandleButtonProps<Descriptor extends InteractionHandleDescriptor> =
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
    readonly label: string;
    readonly descriptor: Descriptor;
    readonly onHandle: (event: InteractionHandleEvent) => void;
  };
```
## `ListboxBinding`

```ts
interface ListboxBinding<Id extends string = string, Item extends ListboxItem<Id> = ListboxItem<Id>> {
  readonly activeId: Id | null;
  readonly referenceProps: {
    readonly "aria-controls": string;
    readonly "aria-expanded": boolean;
    readonly "aria-activedescendant"?: string;
    readonly onKeyDown: KeyboardEventHandler;
  };
  readonly listboxProps: HTMLAttributes<HTMLElement>;
  optionProps(item: Item): ButtonHTMLAttributes<HTMLButtonElement>;
}
```
## `ListboxItem`

```ts
interface ListboxItem<Id extends string = string> {
  readonly id: Id;
  readonly textValue: string;
  readonly disabled?: boolean;
}
```
## `Menu`

```ts
Menu(props: { readonly label: string; readonly trigger: ReactNode; readonly items: ReadonlyArray<MenuItem>; readonly onAction: (id: string) => void; readonly restoreFocusOnAction?: boolean; readonly classNames?: { readonly root?: string; readonly trigger?: string; readonly popup?: string; readonly item?: string; }; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `MenuItem`

```ts
type MenuItem = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly content?: ReactNode;
};
```
## `Popover`

```ts
Popover(props: { readonly label: string; readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly trigger: ReactNode; readonly children: ReactNode; readonly className?: string; readonly panelClassName?: string; }): ReactNode
```
## `ProductCanvas`

```ts
ProductCanvas(props: HTMLAttributes<HTMLDivElement>): ReactNode
```
## `ProductInspector`

```ts
ProductInspector(props: HTMLAttributes<HTMLDivElement>): ReactNode
```
## `ProductShell`

```ts
ProductShell(props: HTMLAttributes<HTMLDivElement> & { readonly toolbar?: ReactNode; readonly toolbarLabel?: string; readonly inspector?: ReactNode; readonly canvasClassName?: string; readonly fill?: boolean; }): ReactNode
```
## `ResizeHandle`

```ts
ResizeHandle(props: ResizeHandleProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `ResizeHandleProps`

```ts
type ResizeHandleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "onResize"> & {
  readonly label: string;
  readonly orientation: "horizontal" | "vertical";
  readonly onResize: (delta: number, phase: "preview" | "commit") => void;
  readonly onHandle?: (event: InteractionHandleEvent) => void;
  readonly descriptor?: ResizeHandleDescriptor;
  readonly className?: string;
};
```
## `Search`

```ts
Search(props: { readonly label: string; readonly query: string; readonly onQueryChange: (query: string) => void; readonly results?: ReactNode; readonly className?: string; readonly inputClassName?: string; }): ReactNode
```
## `SelectableItem`

```ts
SelectableItem<T extends ElementType = "button">(props: SelectableItemProps<T>): ReactNode
```
## `SelectableItemProps`

```ts
type SelectableItemProps<T extends ElementType = "button"> = {
  readonly as?: T;
  readonly selected: boolean;
  readonly focus?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "data-selected" | "data-focus">;
```
## `TabOption`

```ts
type TabOption<T extends string | number> = {
  readonly id: T;
  readonly label: ReactNode;
  readonly disabled?: boolean;
};
```
## `Tabs`

```ts
Tabs<T extends string | number>(props: { readonly label: string; readonly value: T; readonly options: ReadonlyArray<TabOption<T>>; readonly onValueChange: (value: T) => void; readonly tabId: (value: T, index: number) => string; readonly panelId: (value: T, index: number) => string; readonly className?: string; readonly tabClassName?: string; }): ReactNode
```
## `Toggle`

```ts
Toggle(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & FocusPreservingControl & { readonly pressed: boolean; readonly presentation?: "button" | "chip"; readonly label?: string; readonly tooltip?: string; }): ReactNode
```
## `Toolbar`

```ts
Toolbar(props: Omit<HTMLAttributes<HTMLDivElement>, "aria-label"> & { readonly label: string; }): ReactNode
```
## `ToolbarGroup`

```ts
ToolbarGroup(props: Omit<HTMLAttributes<HTMLDivElement>, "aria-label"> & { readonly label?: string; }): ReactNode
```
## `ToolbarLayout`

```ts
ToolbarLayout(props: HTMLAttributes<HTMLDivElement>): ReactNode
```
## `ToolbarRegion`

```ts
ToolbarRegion(props: Omit<HTMLAttributes<HTMLDivElement>, "aria-label"> & { readonly label?: string; readonly placement: ToolbarRegionPlacement; }): ReactNode
```
## `ToolbarRegionPlacement`

```ts
type ToolbarRegionPlacement = "start" | "center" | "end";
```
## `ToolbarSeparator`

```ts
ToolbarSeparator(props: HTMLAttributes<HTMLSpanElement>): ReactNode
```
## `ToolbarSpacer`

```ts
ToolbarSpacer(props: HTMLAttributes<HTMLSpanElement>): ReactNode
```
## `useInteractionHandle`

```ts
useInteractionHandle<ElementType extends Element = HTMLElement>(options: InteractionHandleBindingOptions<ElementType>): { ...; }
```
## `useListbox`

```ts
useListbox<Id extends string, Item extends ListboxItem<Id>>(options: UseListboxOptions<Id, Item>): ListboxBinding<Id, Item>
```
## `UseListboxOptions`

```ts
interface UseListboxOptions<Id extends string = string, Item extends ListboxItem<Id> = ListboxItem<Id>> {
  readonly id: string;
  readonly label: string;
  readonly items: ReadonlyArray<Item>;
  readonly activeId: Id | null;
  readonly selectedId?: Id | null;
  readonly wrap?: boolean;
  readonly onActiveChange: (id: Id | null) => void;
  readonly onAction: (id: Id) => void;
}
```
## `ValueInput`

```ts
ValueInput(props: { readonly label: string; readonly value: number; readonly min: number; readonly max: number; readonly step?: number; readonly onValueChange: (value: number) => void; readonly presentation: "continuous" | "stepped"; readonly disabled?: boolean; readonly className?: string; }): ReactNode
```
