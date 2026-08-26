# @interactive-os/json-document-ui-primitives-react API

**Owner:** UI Primitives

표준 React UI primitive의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-ui-primitives-react/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `ActionButton`

```ts
ActionButton(props: ButtonHTMLAttributes<HTMLButtonElement> & FocusPreservingControl & { readonly kind?: ActionButtonKind; }): ReactNode
```
## `ActionButtonKind`

```ts
type ActionButtonKind = "primary" | "secondary" | "danger";
```
## `ChoiceChip`

```ts
ChoiceChip(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & { readonly selected: boolean; }): ReactNode
```
## `DisclosureButton`

```ts
DisclosureButton(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-expanded" | "aria-controls"> & { readonly expanded: boolean; readonly controls: string; }): ReactNode
```
## `FileDropRegion`

```ts
FileDropRegion(props: Omit<HTMLAttributes<HTMLDivElement>, "onDrop"> & { readonly onFiles: (files: ReadonlyArray<File>) => void; readonly overlay?: ReactNode; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `formatFileSize`

```ts
formatFileSize(bytes: number): string
```
## `GridCell`

```ts
GridCell(props: TdHTMLAttributes<HTMLTableCellElement> & { readonly selected: boolean; readonly focus?: boolean; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `IconButton`

```ts
IconButton(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> & FocusPreservingControl & { readonly label: string; readonly rootClassName?: string; }): ReactNode
```
## `ListboxBinding`

```ts
interface ListboxBinding<Item extends ListboxItem> {
  readonly activeId: string | null;
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
interface ListboxItem {
  readonly id: string;
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
## `MenuItemButton`

```ts
MenuItemButton(props: ButtonHTMLAttributes<HTMLButtonElement>): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `ResizeHandle`

```ts
ResizeHandle(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "onResize"> & { readonly label: string; readonly orientation: "horizontal" | "vertical"; readonly onResize: (delta: number, phase: "preview" | "commit") => void; readonly className?: string; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `SegmentedControl`

```ts
SegmentedControl(props: { readonly label: string; readonly value: string; readonly options: ReadonlyArray<SegmentedControlOption>; readonly onValueChange: (value: string) => void; readonly className?: string; }): ReactNode
```
## `SegmentedControlOption`

```ts
type SegmentedControlOption = {
  readonly id: string;
  readonly label: ReactNode;
  readonly disabled?: boolean;
};
```
## `Select`

```ts
Select(props: { readonly id?: string; readonly label: string; readonly value: string; readonly options: ReadonlyArray<SelectOption>; readonly onValueChange: (value: string) => void; readonly renderValue?: (option: SelectOption) => ReactNode; readonly renderOption?: (option: SelectOption) => ReactNode; readonly classNames?: SelectClassNames; readonly disabled?: boolean; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
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
## `SelectClassNames`

```ts
type SelectClassNames = {
  readonly root?: string;
  readonly trigger?: string;
  readonly listbox?: string;
  readonly option?: string;
  readonly focusedOption?: string;
  readonly selectedOption?: string;
};
```
## `SelectOption`

```ts
type SelectOption = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
};
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
## `ToggleButton`

```ts
ToggleButton(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & FocusPreservingControl & { readonly pressed: boolean; readonly label?: string; readonly tooltip?: string; }): ReactNode
```
## `useListbox`

```ts
useListbox<Item extends ListboxItem>(options: UseListboxOptions<Item>): ListboxBinding<Item>
```
## `UseListboxOptions`

```ts
interface UseListboxOptions<Item extends ListboxItem> {
  readonly id: string;
  readonly label: string;
  readonly items: ReadonlyArray<Item>;
  readonly activeId: string | null;
  readonly selectedId?: string | null;
  readonly wrap?: boolean;
  readonly onActiveChange: (id: string | null) => void;
  readonly onAction: (id: string) => void;
}
```
