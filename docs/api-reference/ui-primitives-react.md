# @interactive-os/json-document-ui-primitives-react API

**Owner:** UI Primitives

표준 React UI primitive의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-ui-primitives-react/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `FileDropRegion`

```ts
FileDropRegion(props: Omit<HTMLAttributes<HTMLDivElement>, "onDrop"> & { readonly onFiles: (files: ReadonlyArray<File>) => void; readonly overlay?: ReactNode; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `GridCell`

```ts
GridCell(props: TdHTMLAttributes<HTMLTableCellElement> & { readonly selected: boolean; readonly focus?: boolean; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
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
## `ResizeHandle`

```ts
ResizeHandle(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "onResize"> & { readonly label: string; readonly orientation: "horizontal" | "vertical"; readonly onResize: (delta: number, phase: "preview" | "commit") => void; readonly className?: string; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `Select`

```ts
Select(props: { readonly id?: string; readonly label: string; readonly value: string; readonly options: ReadonlyArray<SelectOption>; readonly onValueChange: (value: string) => void; readonly renderValue?: (option: SelectOption) => ReactNode; readonly renderOption?: (option: SelectOption) => ReactNode; readonly classNames?: SelectClassNames; readonly disabled?: boolean; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
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
