# @interactive-os/json-document-ui-primitives-react API

**탐색 분류:** UI Primitives

표준 제어·포커스·overlay·접근성 행동의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-ui-primitives-react/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `ActivityCard`

```ts
ActivityCard({ title, actor, dateTime, timeLabel, subject, detail, identifier, children, actions }: ActivityCardProps): ReactNode
```
## `ActivityCardProps`

```ts
interface ActivityCardProps extends DomainCardProps {readonly actor:ReactNode; readonly dateTime:string; readonly timeLabel:string; readonly subject?:ReactNode; readonly detail?:ReactNode;}
```
## `ActivityEntry`

```ts
interface ActivityEntry {readonly id: string; readonly actor: ReactNode; readonly action: ReactNode; readonly dateTime: string; readonly timeLabel: string; readonly detail?: ReactNode; readonly icon?:ReactNode;}
```
## `ActivityFeed`

```ts
ActivityFeed({ label, entries, empty, presentation }: { readonly label: string; readonly entries: readonly ActivityEntry[]; readonly empty?: ReactNode; readonly presentation?: "list" | "timeline"; }): ReactNode
```
## `AppliedFilter`

```ts
interface AppliedFilter {readonly id: string; readonly label: string;}
```
## `ApprovalCard`

```ts
ApprovalCard({ title, identifier, status, change, comparison, requester, requestedAt, changed, children, actions }: ApprovalCardProps): ReactNode
```
## `ApprovalCardProps`

```ts
interface ApprovalCardProps extends DomainCardProps {readonly change?:ReactNode; readonly comparison?:readonly ComparedField[] | undefined; readonly requester?:ReactNode; readonly requestedAt?:ReactNode; readonly changed?:boolean;}
```
## `Avatar`

```ts
Avatar({ name, src, fallback }: { readonly name: string; readonly src?: string | undefined; readonly fallback?: ReactNode; }): ReactNode
```
## `BreadcrumbItem`

```ts
interface BreadcrumbItem { readonly id: string; readonly label: ReactNode; readonly href: string; }
```
## `Breadcrumbs`

```ts
Breadcrumbs({ label, items, renderLink }: { readonly label?: string; readonly items: readonly BreadcrumbItem[]; readonly renderLink?: NavigationLinkRenderer; }): ReactNode
```
## `ChangeComparison`

```ts
ChangeComparison({ label, fields }: { readonly label: string; readonly fields: readonly ComparedField[]; }): ReactNode
```
## `ChatActivity`

```ts
ChatActivity({ label }: { readonly label: string; }): ReactNode
```
## `ChatBubble`

```ts
ChatBubble({ direction, label, children, ...props }: ChatBubbleProps): ReactNode
```
## `ChatBubbleProps`

```ts
interface ChatBubbleProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role" | "aria-label"> {
  readonly direction: "incoming" | "outgoing";
  readonly label: string;
  readonly children: ReactNode;
}
```
## `Check`

```ts
Check(props: { readonly label: string; readonly checked: boolean; readonly indeterminate?: boolean; readonly onCheckedChange: (checked: boolean) => void; readonly disabled?: boolean | undefined; readonly className?: string; }): ReactNode
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
} & ControlAffordanceProps & (
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
## `CodeBlock`

```ts
CodeBlock({ source, label, language, meta, signal, className, size, testId, codeRef, preProps, renderLine, children }: CodeBlockProps): ReactNode
```
## `CodeBlockProps`

```ts
interface CodeBlockProps {
  readonly source: string;
  readonly label?: string;
  readonly language?: string | undefined;
  readonly meta?: ReactNode;
  readonly signal?: ReactNode;
  readonly className?: string;
  readonly size?: "compact" | "content" | "standard" | "tall";
  readonly testId?: string;
  /** The document's canonical selection binding stays with its adapter. */
  readonly codeRef?: Ref<HTMLPreElement>;
  readonly preProps?: HTMLAttributes<HTMLPreElement>;
  readonly renderLine?: (line: string, index: number) => ReactNode;
  /** Structured document nodes may supply their existing rendered children. */
  readonly children?: ReactNode;
}
```
## `Command`

```ts
Command(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> & FocusPreservingControl & ControlAffordanceProps & { readonly kind?: CommandKind; readonly label?: string | undefined; readonly rootClassName?: string; readonly controlRef?: Ref<HTMLButtonElement>; }): ReactNode
```
## `CommandKind`

```ts
type CommandKind = "primary" | "secondary" | "danger";
```
## `CommentComposer`

```ts
CommentComposer({ label, onSubmit, submitLabel, identity, disabled }: { readonly label: string; readonly onSubmit: (text: string) => Promise<void> | void; readonly submitLabel?: string | undefined; readonly identity?: string; readonly disabled?: boolean; }): ReactNode
```
## `ComparedField`

```ts
interface ComparedField {readonly id:string; readonly label:string; readonly before:ReactNode; readonly after:ReactNode;}
```
## `ContentCard`

```ts
ContentCard({ title, header, children, actions, empty, boundary, ...attributes }: ContentCardProps): ReactNode
```
## `ContentCardProps`

```ts
interface ContentCardProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "children"> {readonly title?: ReactNode; readonly header?: ReactNode; readonly children?: ReactNode; readonly actions?: ReactNode; readonly empty?: ReactNode; readonly boundary?: "outline" | "surface";}
```
## `ContentGroup`

```ts
ContentGroup({ label, relationship, children }: { readonly label?: string; readonly relationship?: ContentRelationship; readonly children: ReactNode; }): ReactNode
```
## `contentInteractionAttributes`

```ts
contentInteractionAttributes(input: ContentInteractionInput): ContentInteractionAttributes
```
## `ContentInteractionAttributes`

```ts
type ContentInteractionAttributes = {
  readonly "data-ui-interaction": "content" | "drop-target" | "insertion";
  readonly "data-ui-interaction-phase": "rest" | "active" | "dragging";
  readonly "data-selected"?: "true" | "false";
  readonly "data-primary"?: "true";
  readonly "data-elevated"?: "true";
};
```
## `ContentInteractionInput`

```ts
type ContentInteractionInput =
  | {
      readonly role: "content";
      readonly selected?: boolean;
      readonly primary?: boolean;
      readonly active?: boolean;
      readonly dragging?: boolean;
    }
  | {
      readonly role: "drop-target" | "insertion";
      readonly active: boolean;
    };
```
## `contentPresentation`

```ts
const contentPresentation: { readonly title: "json-document-content-title"; readonly heading: "json-document-content-heading"; readonly itemTitle: "json-document-content-item-title"; readonly itemSummary: "json-document-content-item-summary"; ... 12 more ...; readonly divider: "json-document-content-divider"; }
```
## `ContentRelationship`

```ts
type ContentRelationship = "related" | "group" | "region";
```
## `ContextualControls`

```ts
ContextualControls<Id extends string>(props: Omit<HTMLAttributes<HTMLDivElement>, "children"> & { readonly capabilities: ReadonlyArray<ContextualAffordanceCapability<Id>>; readonly rootRef?: Ref<HTMLDivElement>; readonly revealWithoutHover?: boolean; readonly selected?: boolean; readonly editing?: boolean; readonly children: (snapshot: ContextualAffordanceSnapshot<Id>) => ReactNode; }): ReactNode
```
## `ControlAffordance`

```ts
type ControlAffordance =
  | "persistent"
  | "content-control"
  | "stateful"
  | "contextual"
  | "contextual-danger"
  | "direct"
  | "field"
  | "disabled-preview";
```
## `ControlAffordanceProps`

```ts
type ControlAffordanceProps = {
  /** Declares how a product theme reveals this control without changing its semantic role. */
  readonly affordance?: ControlAffordance;
};
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
## `dataPresentationCatalog`

```ts
const dataPresentationCatalog: readonly [{ readonly id: "title"; readonly data: "대상의 이름"; readonly schemaRoles: readonly ["title"]; readonly read: { readonly api: "PageHeader / 제목 slot"; readonly components: readonly ["page-header", "heading"]; }; readonly write: { ...; }; readonly entry: "명시적인 제목 수정"; readonly commit: "명시적 저장 또는 제품이 정한 즉시 반영"; }...
```
## `DataPresentationRole`

```ts
type DataPresentationRole = typeof dataPresentationCatalog[number]["id"];
```
## `DateDisplay`

```ts
DateDisplay({ value, children, overdue }: { readonly value: string; readonly children: ReactNode; readonly overdue?: boolean; }): ReactNode
```
## `DateRangeDisplay`

```ts
DateRangeDisplay({ start, end, startLabel, endLabel }: { readonly start: string; readonly end: string; readonly startLabel?: ReactNode; readonly endLabel?: ReactNode; }): ReactNode
```
## `Dialog`

```ts
Dialog(props: { readonly label: string; readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly children: ReactNode; readonly className?: string; readonly presentation?: "modal" | "sheet"; readonly dismissBoundary?: RefObject<HTMLElement | null> | undefined; readonly viewportOffset?: { readonly x: number; readonly y: number; } | undefined; readonly inert?: boolean | undefined; }): ReactNode
```
## `DisclosureButton`

```ts
DisclosureButton(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-expanded" | "aria-controls"> & ControlAffordanceProps & { readonly expanded: boolean; readonly controls: string; }): ReactNode
```
## `DomainCardProps`

```ts
interface DomainCardProps {
  readonly title: ReactNode;
  readonly identifier?: ReactNode;
  readonly status?: ReactNode;
  readonly children?: ReactNode;
  readonly actions?: ReactNode;
}
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
## `EditableText`

```ts
EditableText({ label, value, identity, disabled, onCommit }: { readonly label: string; readonly value: string; readonly identity?: string | undefined; readonly disabled?: boolean; readonly onCommit: (value: string) => boolean | void; }): ReactNode
```
## `EditingControls`

```ts
EditingControls({ label, choices, actions, onRequestEdit, requestLabel, children }: EditingControlsProps): ReactNode
```
## `EditingControlsProps`

```ts
interface EditingControlsProps {
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
```
## `ElapsedTime`

```ts
ElapsedTime({ startedAt, endedAt, label }: { readonly startedAt: number; readonly endedAt?: number; readonly label?: string; }): ReactNode
```
## `EmptyState`

```ts
EmptyState({ title, description, actions }: { readonly title: ReactNode; readonly description?: ReactNode; readonly actions?: ReactNode; }): ReactNode
```
## `EventCard`

```ts
EventCard({ title, identifier, status, schedule, location, participants, agenda, children, actions }: EventCardProps): ReactNode
```
## `EventCardProps`

```ts
interface EventCardProps extends DomainCardProps {readonly schedule:ReactNode; readonly location?:ReactNode; readonly participants?:ReactNode; readonly agenda?:ReactNode;}
```
## `EvidenceCard`

```ts
EvidenceCard({ title, identifier, status, body, source, empty, children, actions }: EvidenceCardProps): ReactNode
```
## `EvidenceCardProps`

```ts
interface EvidenceCardProps extends DomainCardProps {readonly body?:ReactNode; readonly source?:ReactNode; readonly empty?:ReactNode;}
```
## `ExecutionFeedback`

```ts
ExecutionFeedback({ state, label, description, onCancel, onRetry }: { readonly state: "idle" | "running" | "error" | "complete"; readonly label: string; readonly description?: ReactNode; readonly onCancel?: () => void; readonly onRetry?: () => void; }): ReactNode
```
## `Field`

```ts
Field(props: FieldProps): ReactNode
```
## `fieldPresentation`

```ts
const fieldPresentation: { readonly standard: "json-document-field"; readonly checkbox: "json-document-check"; readonly seamless: "json-document-field json-document-field-seamless"; }
```
## `FieldPresentation`

```ts
FieldPresentation({ label, mode, read, edit, onEditRequest, heading, disabled }: { readonly label: string; readonly mode: "read" | "edit"; readonly read: ReactNode; readonly edit: ReactNode; readonly onEditRequest?: () => void; readonly heading?: ReactNode; readonly disabled?: boolean; }): ReactNode
```
## `FileCard`

```ts
FileCard({ title, identifier, status, format, size, updated, preview, owner, children, actions }: FileCardProps): ReactNode
```
## `FileCardProps`

```ts
interface FileCardProps extends DomainCardProps {readonly format?:ReactNode; readonly size?:ReactNode; readonly updated?:ReactNode; readonly preview?:ReactNode; readonly owner?:ReactNode;}
```
## `FileDropRegion`

```ts
FileDropRegion(props: Omit<HTMLAttributes<HTMLDivElement>, "onDrop"> & { readonly onFiles: (files: ReadonlyArray<File>) => void; readonly overlay?: ReactNode; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `FilterBar`

```ts
FilterBar({ label, children, filters, onRemove, onReset, resultCount }: { readonly label: string; readonly children?: ReactNode; readonly filters: readonly AppliedFilter[]; readonly onRemove: (id: string) => void; readonly onReset: () => void; readonly resultCount?: number | undefined; }): ReactNode
```
## `floatingSurface`

```ts
const floatingSurface: { readonly control: "json-document-floating-control"; readonly panel: "json-document-floating-panel"; }
```
## `FormField`

```ts
FormField({ id, label, description, error, required, children }: FormFieldProps): ReactNode
```
## `FormFieldControlProps`

```ts
interface FormFieldControlProps {
  readonly id: string;
  readonly required: boolean;
  readonly "aria-describedby"?: string | undefined;
  readonly "aria-invalid"?: true | undefined;
}
```
## `FormFieldProps`

```ts
interface FormFieldProps {
  readonly id?: string;
  readonly label: string;
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly required?: boolean;
  readonly children: (control: FormFieldControlProps) => ReactNode;
}
```
## `getDataPresentation`

```ts
getDataPresentation(role: DataPresentationRole): { readonly id: "title"; readonly data: "대상의 이름"; readonly schemaRoles: readonly ["title"]; readonly read: { readonly api: "PageHeader / 제목 slot"; readonly components: readonly ["page-header", "heading"]; }; readonly write: { ...; }; readonly entry: "명시적인 제목 수정"; readonly commit: "명시적 저장 또는 제품이 정한 즉시 반영"; } | ... 16 more ... | { ...; }
```
## `GridCell`

```ts
GridCell(props: TdHTMLAttributes<HTMLTableCellElement> & { readonly selected: boolean; readonly primary?: boolean; readonly focus?: boolean; readonly active?: boolean; readonly dragging?: boolean; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `InlineAlert`

```ts
InlineAlert({ title, children, tone, actions }: { readonly title: ReactNode; readonly children?: ReactNode; readonly tone?: "info" | "error" | "success"; readonly actions?: ReactNode; }): ReactNode
```
## `InlineCode`

```ts
InlineCode({ children, prompt, ...attributes }: HTMLAttributes<HTMLElement> & { readonly prompt?: boolean; }): ReactNode
```
## `InquiryCard`

```ts
InquiryCard({ title, identifier, status, body, customer, priority, unread, presentation, children, actions }: InquiryCardProps): ReactNode
```
## `InquiryCardProps`

```ts
interface InquiryCardProps extends DomainCardProps {readonly body?:ReactNode; readonly customer?:ReactNode; readonly priority?:ReactNode; readonly unread?:boolean; readonly presentation?:"conversation"|"correspondence";}
```
## `InteractionHandleBindingOptions`

```ts
type InteractionHandleBindingOptions<ElementType extends Element = HTMLElement> = {
  readonly descriptor: InteractionHandleDescriptor;
  /** Delegated surfaces capture on the hit item so native click/double-click retain their target. */
  readonly captureTarget?: (event: PointerEvent<ElementType>) => ElementType;
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
## `IssueRow`

```ts
IssueRow({ title, summary, identifier, status, assignee, updatedAt, leading, indicators, selected, disabled, selection, actions, onSelect }: IssueRowProps): ReactNode
```
## `IssueRowProps`

```ts
interface IssueRowProps {
  readonly title: ReactNode;
  readonly summary?: ReactNode;
  readonly identifier?: ReactNode;
  readonly status?: ReactNode;
  readonly assignee?: ReactNode;
  readonly updatedAt?: ReactNode;
  readonly leading?: ReactNode;
  readonly indicators?: ReactNode;
  readonly selected?: boolean;
  readonly disabled?: boolean | undefined;
  /** Collection membership is independent of the record currently opened in detail. */
  readonly selection?: IssueRowSelection;
  /** Independent commands stay outside the primary selection button. */
  readonly actions?: ReactNode;
  readonly onSelect: () => void;
}
```
## `IssueRowSelection`

```ts
interface IssueRowSelection {
  readonly label: string;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}
```
## `linkPresentation`

```ts
const linkPresentation: { readonly inline: "json-document-link"; readonly action: "json-document-link json-document-link-action"; }
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
Menu(props: MenuProps): ReactNode
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
## `MenuProps`

```ts
interface MenuProps {
  readonly label: string;
  readonly trigger: ReactNode;
  readonly triggerPresentation?: "label" | "icon";
  readonly items: ReadonlyArray<MenuItem>;
  readonly onAction: (id: string) => void;
  readonly restoreFocusOnAction?: boolean;
  readonly classNames?: { readonly root?: string; readonly trigger?: string; readonly popup?: string; readonly item?: string };
}
```
## `MessageThread`

```ts
MessageThread({ label, messages, children, presentation }: { readonly label: string; readonly messages: readonly ThreadMessage[]; readonly children?: ReactNode; readonly presentation?: "conversation" | "correspondence"; }): ReactNode
```
## `MoneyDisplay`

```ts
MoneyDisplay({ value, currency, locale, emptyLabel, className, ...attributes }: NumericPresentationProps & { readonly currency: string; }): ReactNode
```
## `NavigationGroup`

```ts
interface NavigationGroup {
  readonly id: string;
  readonly label?: ReactNode;
  readonly icon?: ReactNode;
  readonly items: readonly NavigationItem[];
  readonly expanded?: boolean;
  readonly onExpandedChange?: (expanded: boolean) => void;
}
```
## `NavigationItem`

```ts
interface NavigationItem {
  readonly id: string;
  readonly label: ReactNode;
  readonly href: string;
  readonly count?: number;
  readonly icon?: ReactNode;
  readonly children?: readonly NavigationItem[];
}
```
## `NavigationLinkRenderer`

```ts
type NavigationLinkRenderer = (item: NavigationItem, attributes: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) => ReactNode;
```
## `NumberField`

```ts
NumberField({ label, value, onValueChange, min, max, precision, unit, required, disabled }: NumberFieldProps): ReactNode
```
## `NumberFieldProps`

```ts
interface NumberFieldProps {
  readonly label: string;
  readonly value: number | null;
  readonly onValueChange: (value: number | null) => void;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  /** Maximum allowed fractional digits; currency/quantity policy belongs to the domain. */
  readonly precision?: number | undefined;
  readonly unit?: string | undefined;
  readonly required?: boolean | undefined;
  readonly disabled?: boolean | undefined;
}
```
## `PageHeader`

```ts
PageHeader({ title, description, identifier, status, actions, artwork, level, titleRole }: PageHeaderProps): ReactNode
```
## `PageHeaderProps`

```ts
interface PageHeaderProps {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly identifier?: ReactNode;
  readonly status?: ReactNode;
  readonly actions?: ReactNode;
  readonly artwork?: ReactNode;
  readonly level?: 1 | 2;
  readonly titleRole?: "primary" | "section";
}
```
## `PeoplePicker`

```ts
PeoplePicker({ label, people, value, onValueChange, disabled }: { readonly label: string; readonly people: readonly PersonOption[]; readonly value: string; readonly onValueChange: (id: string) => void; readonly disabled?: boolean; }): ReactNode
```
## `PersonCard`

```ts
PersonCard({ title, name, src, role, organization, contact, status, identifier, children, actions }: PersonCardProps): ReactNode
```
## `PersonCardProps`

```ts
interface PersonCardProps extends DomainCardProps {readonly name:string; readonly src?:string; readonly role?:ReactNode; readonly organization?:ReactNode; readonly contact?:ReactNode;}
```
## `PersonIdentity`

```ts
PersonIdentity({ name, src }: { readonly name: string; readonly src?: string | undefined; }): ReactNode
```
## `PersonOption`

```ts
interface PersonOption {readonly id: string; readonly name: string; readonly description?:string; readonly src?: string; readonly disabled?: boolean;}
```
## `Popover`

```ts
Popover(props: { readonly disabled?: boolean | undefined; readonly label: string; readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly trigger: ReactNode; readonly triggerPresentation?: "label" | "icon"; readonly children: ReactNode; readonly className?: string; readonly panelClassName?: string; readonly dismissBoundary?: RefObject<HTMLElement | null> | undefined; readonly autoFocus?: boolean; readonly dismissOnOutsideInteraction?: boolean; readonly panelStyle?: CSSProperties; readonly panelRef?: Ref<HTMLDivElement>; }): ReactNode
```
## `PriorityIndicator`

```ts
PriorityIndicator({ label, level }: { readonly label: string; readonly level: "low" | "normal" | "high"; }): ReactNode
```
## `ProductCanvas`

```ts
ProductCanvas(props: HTMLAttributes<HTMLDivElement>): ReactNode
```
## `ProductCard`

```ts
ProductCard({ title, identifier, status, category, quantity, price, note, children, actions }: ProductCardProps): ReactNode
```
## `ProductCardProps`

```ts
interface ProductCardProps extends DomainCardProps {readonly category?:ReactNode; readonly quantity?:{readonly value:number|null; readonly unit:string} | undefined; readonly price?:{readonly value:number|null; readonly currency:string} | undefined; readonly note?:ReactNode;}
```
## `ProductInspector`

```ts
ProductInspector(props: HTMLAttributes<HTMLElement> & { readonly heading?: ReactNode; readonly footer?: ReactNode; readonly presentation?: "attached" | "floating"; readonly open?: boolean; readonly onClose?: () => void; readonly closeLabel?: string; }): ReactNode
```
## `ProductShell`

```ts
ProductShell(props: HTMLAttributes<HTMLDivElement> & { readonly toolbar?: ReactNode; readonly toolbarLabel?: string; readonly toolbarPresentation?: "attached" | "floating"; readonly inspector?: ReactNode; readonly canvasClassName?: string; readonly fill?: boolean; }): ReactNode
```
## `PropertyEditor`

```ts
PropertyEditor({ label, items }: { readonly label: string; readonly items: readonly PropertyEditorItem[]; }): ReactNode
```
## `PropertyEditorItem`

```ts
interface PropertyEditorItem {
  readonly id: string;
  readonly label: string;
  /** A read-only value or an existing labelled Field/Choice/DatePicker. */
  readonly value: ReactNode;
}
```
## `QuantityDisplay`

```ts
QuantityDisplay({ value, unit, locale, emptyLabel, className, ...attributes }: NumericPresentationProps & { readonly unit: string; }): ReactNode
```
## `RecordContext`

```ts
RecordContext({ icon, label, children }: RecordContextProps): ReactNode
```
## `RecordContextProps`

```ts
interface RecordContextProps {readonly icon?:SemanticIconKind; readonly label?:string; readonly children?:ReactNode;}
```
## `RecordDetail`

```ts
RecordDetail({ header, children, supplementary, actions }: RecordDetailProps): ReactNode
```
## `RecordDetailProps`

```ts
interface RecordDetailProps {
  readonly header?:ReactNode;
  readonly children?:ReactNode;
  readonly supplementary?:ReactNode;
  readonly actions?:ReactNode;
}
```
## `RecordFact`

```ts
interface RecordFact {readonly id:string; readonly label:ReactNode; readonly value:ReactNode; readonly actions?:ReactNode;}
```
## `RecordFacts`

```ts
RecordFacts({ items, label, presentation }: { readonly items: readonly RecordFact[]; readonly label?: string; readonly presentation?: "grid" | "list"; }): ReactNode
```
## `RecordSummary`

```ts
RecordSummary({ title, leading, status, indicators, summary, metadata, headingLevel }: RecordSummaryProps): ReactNode
```
## `RecordSummaryProps`

```ts
interface RecordSummaryProps {
  readonly title: ReactNode;
  readonly leading?: ReactNode;
  readonly status?: ReactNode;
  readonly indicators?: ReactNode;
  readonly summary?: ReactNode;
  readonly metadata?: ReactNode;
  readonly headingLevel?: 2 | 3;
}
```
## `RecordWorkspace`

```ts
RecordWorkspace({ header, listHeader, list, detailHeader, detail, properties, hasSelection }: { readonly header?: ReactNode; readonly listHeader?: ReactNode; readonly list: ReactNode; readonly hasSelection?: boolean; readonly detailHeader?: ReactNode; readonly detail: ReactNode; readonly properties?: ReactNode; }): ReactNode
```
## `ResizeHandle`

```ts
ResizeHandle(props: ResizeHandleProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `ResizeHandleProps`

```ts
type ResizeHandleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "onResize"> & ControlAffordanceProps & {
  readonly label: string;
  readonly orientation: "horizontal" | "vertical";
  readonly onResize: (delta: number, phase: "preview" | "commit") => void;
  readonly onHandle?: (event: InteractionHandleEvent) => void;
  readonly descriptor?: ResizeHandleDescriptor;
  readonly className?: string;
};
```
## `ResultPanel`

```ts
ResultPanel({ title, children, actions, empty }: { readonly title: ReactNode; readonly children?: ReactNode; readonly actions?: ReactNode; readonly empty?: ReactNode; }): ReactNode
```
## `Search`

```ts
Search(props: { readonly inputProps?: Pick<InputHTMLAttributes<HTMLInputElement>, "onKeyDown" | "aria-controls" | "aria-activedescendant" | "disabled">; readonly label: string; readonly query: string; readonly onQueryChange: (query: string) => void; readonly results?: ReactNode; readonly placeholder?: string; readonly className?: string; readonly inputClassName?: string; }): ReactNode
```
## `SelectableItem`

```ts
SelectableItem<T extends ElementType = "button">(props: SelectableItemProps<T>): ReactNode
```
## `SelectableItemProps`

```ts
type SelectableItemProps<T extends ElementType = "button"> = {
  readonly as?: T;
  readonly presentation?: "row";
  readonly selected: boolean;
  readonly primary?: boolean;
  readonly focus?: boolean;
  readonly active?: boolean;
  readonly dragging?: boolean;
} & ControlAffordanceProps & Omit<ComponentPropsWithoutRef<T>, "as" | "data-selected" | "data-focus">;
```
## `SemanticIcon`

```ts
SemanticIcon({ kind, label }: { readonly kind: SemanticIconKind; readonly label?: string | undefined; }): ReactNode
```
## `SemanticIconKind`

```ts
type SemanticIconKind = keyof typeof icons;
```
## `SidebarNavigation`

```ts
SidebarNavigation({ label, groups, currentId, onNavigate, renderLink, collapsed }: { readonly label: string; readonly groups: readonly NavigationGroup[]; readonly currentId?: string | undefined; readonly onNavigate?: (id: string) => void; readonly renderLink?: NavigationLinkRenderer; readonly collapsed?: boolean; }): ReactNode
```
## `StateIndicator`

```ts
StateIndicator({ state, label }: { readonly state: StateIndicatorState; readonly label: string; }): ReactNode
```
## `StateIndicatorState`

```ts
type StateIndicatorState = "unread" | "changed" | "running" | "overdue" | "complete";
```
## `StatusBadge`

```ts
StatusBadge({ children, icon, tone }: { readonly children: ReactNode; readonly icon?: ReactNode; readonly tone?: StatusBadgeTone; }): ReactNode
```
## `StatusBadgeTone`

```ts
type StatusBadgeTone = "neutral" | "active" | "success" | "attention";
```
## `Stepper`

```ts
Stepper({ label, steps }: { readonly label: string; readonly steps: readonly WorkflowStep[]; }): ReactNode
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
## `Tag`

```ts
Tag({ children, ...attributes }: HTMLAttributes<HTMLSpanElement>): ReactNode
```
## `TagGroup`

```ts
TagGroup({ label, items, emptyLabel }: { readonly label: string; readonly items: readonly TagOption[]; readonly emptyLabel?: string; }): ReactNode
```
## `TagOption`

```ts
interface TagOption {readonly id:string; readonly label:string; readonly disabled?:boolean;}
```
## `TagPicker`

```ts
TagPicker({ label, options, value, onValueChange, disabled }: { readonly label: string; readonly options: readonly TagOption[]; readonly value: readonly string[]; readonly onValueChange: (value: readonly string[]) => void; readonly disabled?: boolean; }): ReactNode
```
## `TaskCard`

```ts
TaskCard({ title, identifier, status, summary, assignee, due, priority, completed, overdue, flagged, onCompletedChange, children, actions }: TaskCardProps): ReactNode
```
## `TaskCardProps`

```ts
interface TaskCardProps extends DomainCardProps {readonly summary?:ReactNode; readonly assignee?:ReactNode; readonly due?:ReactNode; readonly priority?:ReactNode; readonly completed?:boolean; readonly overdue?:boolean; readonly flagged?:boolean; readonly onCompletedChange?:(value:boolean)=>void;}
```
## `ThreadMessage`

```ts
interface ThreadMessage {readonly id:string; readonly sender:ReactNode; readonly body:ReactNode; readonly direction:"incoming"|"outgoing"; readonly dateTime?:string; readonly timeLabel?:string;}
```
## `Toast`

```ts
Toast({ message, onDismiss }: { readonly message: ReactNode; readonly onDismiss: () => void; }): ReactNode
```
## `Toggle`

```ts
Toggle(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & FocusPreservingControl & ControlAffordanceProps & { readonly pressed: boolean; readonly presentation?: "button" | "chip" | "icon"; readonly label?: string; readonly tooltip?: string; }): ReactNode
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
## `WaveDots`

```ts
WaveDots({ announce, label, frame, children, ...props }: HTMLAttributes<HTMLSpanElement> & { readonly announce?: boolean; readonly label?: string; readonly frame?: "none" | "bubble"; }): ReactNode
```
## `WindowDock`

```ts
WindowDock({ label, items, activeId, activationKey, onActivate, onClose, action, notice, className }: WindowDockProps): ReactNode
```
## `WindowDockItem`

```ts
interface WindowDockItem {
  readonly id: string;
  readonly title: string;
  readonly status?: string;
  readonly content: ReactNode;
}
```
## `WindowDockProps`

```ts
interface WindowDockProps {
  readonly label: string;
  readonly items: ReadonlyArray<WindowDockItem>;
  /** A newly activated item opens without closing other requested windows. */
  readonly activeId: string;
  /** Change to reopen the active window even when its id did not change. */
  readonly activationKey?: string;
  readonly onActivate: (id: string) => void;
  readonly onClose?: (id: string) => void;
  readonly action?: ReactNode;
  readonly notice?: ReactNode;
  readonly className?: string;
}
```
## `WorkflowStep`

```ts
interface WorkflowStep {readonly id: string; readonly label: string; readonly state: "pending" | "current" | "complete";}
```
