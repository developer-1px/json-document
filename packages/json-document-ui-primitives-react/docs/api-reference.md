# @interactive-os/json-document-ui-primitives-react API

**탐색 분류:** UI Primitives

표준 제어·포커스·overlay·접근성 행동의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-ui-primitives-react/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

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
Check(props: { readonly label: string; readonly checked: boolean; readonly indeterminate?: boolean; readonly onCheckedChange: (checked: boolean) => void; readonly disabled?: boolean; readonly className?: string; }): ReactNode
```
## `FormField`

```ts
FormField(props: FormFieldProps): ReactNode
interface FormFieldProps {
  readonly id?: string;
  readonly label: string;
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly required?: boolean;
  readonly children: (control: FormFieldControlProps) => ReactNode;
}
interface FormFieldControlProps {
  readonly id: string;
  readonly required: boolean;
  readonly "aria-describedby"?: string;
  readonly "aria-invalid"?: true;
}
```

[레이블·도움말·오류 계약과 Usage](form-fields.md). NumberField와 UI Builder 입력도 이 정본을 사용한다.

## `IssueRow.selection` / `IssueRow.actions`

```ts
interface IssueRowSelection {
  readonly label: string;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}
```

`IssueRowProps.selection?: IssueRowSelection`은 일괄 작업의 체크 대상,
`actions?: ReactNode`는 행별 명령이다. selected/onSelect의 상세 열기와 독립적이다.
체크·주 선택 버튼·명령은 형제 대상으로 렌더되어 버튼이 중첩되지 않는다.
[소유 계약과 실제 Usage](record-presentation.md).

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
## `Command`

```ts
Command(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> & FocusPreservingControl & ControlAffordanceProps & { readonly kind?: CommandKind; readonly label?: string; readonly rootClassName?: string; readonly controlRef?: Ref<HTMLButtonElement>; }): ReactNode
```
## `CommandKind`

```ts
type CommandKind = "primary" | "secondary" | "danger";
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

`itemTitle`과 `itemSummary`는 선택 목록 항목의 제목과 요약용 class recipe다.
각각 `json-document-content-item-title`, `json-document-content-item-summary`를
반환하며 기존 title/body 타이포그래피 토큰을 사용한다.

```ts
const contentPresentation: { readonly title: "json-document-content-title"; readonly heading: "json-document-content-heading"; readonly value: "json-document-content-value"; readonly body: "json-document-content-body"; readonly caption: "json-document-content-caption"; readonly group: "json-document-content-group"; readonly list: "json-docume...
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
## `Dialog`

```ts
Dialog(props: { readonly label: string; readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly children: ReactNode; readonly className?: string; readonly presentation?: "modal" | "sheet"; }): ReactNode
```
## `DisclosureButton`

```ts
DisclosureButton(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-expanded" | "aria-controls"> & ControlAffordanceProps & { readonly expanded: boolean; readonly controls: string; }): ReactNode
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
Field(props: FieldProps): ReactNode
```
## `fieldPresentation`

```ts
const fieldPresentation: { readonly standard: "json-document-field"; readonly checkbox: "json-document-check"; readonly seamless: "json-document-field json-document-field-seamless"; }
```
## `FileDropRegion`

```ts
FileDropRegion(props: Omit<HTMLAttributes<HTMLDivElement>, "onDrop"> & { readonly onFiles: (files: ReadonlyArray<File>) => void; readonly overlay?: ReactNode; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `floatingSurface`

```ts
const floatingSurface: { readonly control: "json-document-floating-control"; readonly panel: "json-document-floating-panel"; }
```
## `GridCell`

```ts
GridCell(props: TdHTMLAttributes<HTMLTableCellElement> & { readonly selected: boolean; readonly primary?: boolean; readonly focus?: boolean; readonly active?: boolean; readonly dragging?: boolean; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
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
`MenuProps`는 label, trigger, items, onAction과 선택적인 restoreFocusOnAction/classNames,
triggerPresentation("label" | "icon", 기본 label)을 받는다. icon은 기존 아이콘 Command의
표현·접근성 이름·툴팁을 소비한다. [계약과 Usage](record-presentation.md).

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
Popover(props: { readonly label: string; readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly trigger: ReactNode; readonly triggerPresentation?: "label" | "icon"; readonly children: ReactNode; readonly className?: string; readonly panelClassName?: string; }): ReactNode
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
ProductShell(props: HTMLAttributes<HTMLDivElement> & { readonly toolbar?: ReactNode; readonly toolbarLabel?: string; readonly toolbarPresentation?: "attached" | "floating"; readonly inspector?: ReactNode; readonly canvasClassName?: string; readonly fill?: boolean; }): ReactNode
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
## `Search`

```ts
Search(props: { readonly label: string; readonly query: string; readonly onQueryChange: (query: string) => void; readonly results?: ReactNode; readonly placeholder?: string; readonly className?: string; readonly inputClassName?: string; }): ReactNode
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

## Shared presentation styles

Import `@interactive-os/json-document-ui-primitives-react/design-system.css` for
the shared tokens,36px text controls,32px icon controls and content hierarchy.
Floating Toolbar has a4px default inset; Hosts may override spacing.
[Design system Usage](/demo/ui-primitives) exercises controls, focus and states.
[Chat Usage](/demo/chat) exercises message Hug and the Composer input surface.

`Search`의 선택적 `placeholder`는 빈 입력의 안내입니다. 생략하면 접근성 `label`을
안내로 표시합니다. 입력값이나 실제 필터링 계약은 변경하지 않습니다.

## RecordWorkspace

```ts
RecordWorkspace(props: { header?: ReactNode; listHeader?: ReactNode; list: ReactNode; detailHeader?: ReactNode; detail: ReactNode; properties?: ReactNode; hasSelection?: boolean }): ReactNode
```

목록 헤더와 상세 헤더는 고정되고 목록·본문·속성은 독립 스크롤합니다.
[이슈 작업 공간 Usage](/applications/ui-builder?example=issues&new=1)는 공개 API를 빌더 조합으로 사용합니다.

Popover.dismissBoundary?: RefObject<HTMLElement | null>은 바깥 pointer/focus로
닫히는 작업 영역을 지정한다. 생략하면 기존 document 전체 바깥 동작을 유지한다.
지정하면 경계 밖 Host 컨트롤의 클릭·포커스 이동은 펼침 상태를 보존하고 경계
안에서 Popover 바깥으로 이동하면 닫는다. Escape 닫기·포커스 복귀는 유지한다.

## EditableText

```ts
EditableText(props: { label: string; value: string; identity?: string; disabled?: boolean; onCommit: (value: string) => boolean | void }): ReactNode
```

읽기 상태가 기본입니다. 편집은 로컬 draft이고 저장할 때만 onCommit을 호출합니다.
취소/Escape는 저장하지 않으며 identity가 바뀌면 이전 draft를 버립니다.
[이슈 본문 Usage](/applications/ui-builder?example=issues&new=1)에서 읽기·저장·취소를 사용합니다.

Dialog.dismissBoundary?: RefObject<HTMLElement | null>은 제품 surface의 바깥 클릭
범위를 지정한다. 지정된 경우 Host 컨트롤은 backdrop을 통과해 접근할 수 있고,
제품 surface 안에서 dialog 바깥을 누르면 닫는다. 생략하면 기존 document modal
backdrop을 유지한다. Escape·초기 포커스·Tab 순환·포커스 복귀 계약은 유지한다.

`Dialog.viewportOffset?: {readonly x: number; readonly y: number}`을 지정하면
document.body의 Portal에 렌더링하고 panel에 지정한 변위만 적용한다. transform이
있는 조상에서도 viewport 위치를 유지한다. `Dialog.inert?: boolean`은 편집 중
Portal의 콘텐츠 입력과 포커스를 차단한다. 생략 시 기존 동작을 유지한다.
[오버레이 Usage](/applications/ui-builder?example=catalog&page=catalog%3Acomposition).

## Record presentation

`StatusBadge`, `IssueRow`, `PropertyEditor`, `ResultPanel` 및 확장한 `ProductInspector`의 props와 경계는 [Record presentation](record-presentation.md)에 있습니다. [Usage](/demo/ui-primitives#design-system-record-workflow).

## Product workflow

[Product workflow API와 콘텐츠 매핑](product-workflow.md)은 PageHeader, SidebarNavigation, FilterBar, Avatar, PersonIdentity, PriorityIndicator, DateDisplay, PeoplePicker, CommentComposer, EmptyState, InlineAlert, ExecutionFeedback, Toast, Stepper, ActivityFeed의 props·경계·Usage를 설명합니다. ChoiceOption.description과 Popover.disabled도 같은 계약을 사용합니다.

`ContentCard(props: ContentCardProps)`는 독립 콘텐츠의 title/body/empty/actions 정본입니다. ResultPanel과 빌더 card가 같은 구현을 소비합니다. [실제 결과 카드 Usage](/demo/ui-primitives#design-system-product-workflow).

## Data presentation

`dataPresentationCatalog`, `getDataPresentation(role: DataPresentationRole)` 및 `FieldPresentation({label,mode,read,edit,onEditRequest?})`는 [데이터 의미별 읽기·쓰기 계약](data-presentation.md)을 소유합니다. [실제 Usage](/demo/ui-primitives#design-system-data-presentation).

## Layout spacing

공개 design-tokens.css의 --space-related(8px), --space-group(16px), --space-region(32px)는 콘텐츠/레이아웃 간격 세 관계의 정본입니다. page-inline은 group, page-inline-wide는 region alias입니다. [역할과 여백 소유권](design-system.md#간격-세-관계만-사용), [Usage](/demo/ui-primitives#design-system-tokens).

## QuantityDisplay

```ts
QuantityDisplay(props: Omit<HTMLAttributes<HTMLSpanElement>, "children"> & { value: number | null | undefined; unit: string; locale?: string; emptyLabel?: string }): ReactNode
```

읽기 수량을 실제 단위와 표시한다. 0은 유효하며 빈/비유한 값은 emptyLabel이다. 세부 정책과 Usage는 [디자인 시스템](design-system.md#수량과-금액-읽기)에 있다.

## MoneyDisplay

```ts
MoneyDisplay(props: Omit<HTMLAttributes<HTMLSpanElement>, "children"> & { value: number | null | undefined; currency: string; locale?: string; emptyLabel?: string }): ReactNode
```

명시한 통화의 주 단위 금액을 표시한다. 환전/입력/저장 정책을 소유하지 않는다. 세부 계약과 Usage는 [디자인 시스템](design-system.md#수량과-금액-읽기)에 있다.

ContentCard의 본문/행동과 그룹·IssueRow·ProductInspector 표면 선택은
[같은 문의 데이터 Usage](/demo/ui-primitives#design-system-content)에서 비교할 수 있습니다.
공통 content-card 본문은 16px gap, footer는 제목/본문 gap과 합쳐 16px로 구분합니다.
선택·이동·완료 행동은 주입된 기존 컨트롤이 소유합니다.

## 도메인 카드 조합

`InquiryCard(InquiryCardProps)`, `TaskCard(TaskCardProps)`,
`ProductCard(ProductCardProps)`, `ApprovalCard(ApprovalCardProps)`,
`ActivityCard(ActivityCardProps)`, `EvidenceCard(EvidenceCardProps)`와 각 props 타입은
패키지 정본 공개 API입니다. 공통 `DomainCardProps`는 title/identifier/status/
children/actions를 받습니다. [데이터 관계·입력 계약](domain-cards.md),
[실제 Usage](/demo/ui-primitives#design-system-domain-cards).

`ContentCardProps.header?: ReactNode`는 PageHeader 같은 정본 헤더를 주입하며
기본 title 헤더보다 우선합니다. 카드마다 시각 구현을 복제하지 않습니다.

## `ContentGroup`

`ContentGroup({label?,relationship?,children})`는 related/group/region의 8/16/32 관계를
가까운 공통 부모에서 표현합니다. ContentRelationship을 공개합니다.
[경계 선택](record-affordances.md), [Usage](/demo/ui-primitives#design-system-domain-cards).

## `RecordSummary`, `MessageThread`, `ChangeComparison`

RecordSummaryProps, ThreadMessage, ComparedField와 함께 공개합니다. 같은 카드 틀을
강제하지 않고 요약·메시지·실제 변경 비교를 구분합니다.
[입력 계약](record-affordances.md), [Usage](/demo/ui-primitives#design-system-domain-cards).

## `SemanticIcon`, `StateIndicator`

SemanticIconKind는 등록된 Lucide 의미 키입니다. StateIndicatorState는
unread/changed/running/overdue/complete이며 label이 필수입니다.
StatusBadge.icon, IssueRow.leading/indicators 및 ActivityFeed.presentation=timeline도
같은 계약을 소비합니다. [API](record-affordances.md),
[Usage](/demo/ui-primitives#design-system-domain-cards).


### 도메인 중립적인 상세 구성

- `RecordDetail`, `RecordDetailProps`: header / children / supplementary / actions 슬롯.
- `RecordContext`, `RecordContextProps`: 실제 아이콘·맥락 연결, 빈 값 생략.
- `RecordFacts`, `RecordFact`: 한 대상의 `{id,label,value}` 속성 쌍.
- `MessageThread.presentation`: conversation / correspondence의 데이터 관계 선택.

[소유 API 계약](record-affordances.md) · [Usage](../../../site/src/routes/ui-primitives-catalog/DomainCardsSpecimen.tsx)


### PageHeader 제목의 정보 위계

`PageHeader.titleRole?: "primary" | "section"`은 기존 content-title/content-heading을 선택하며 기본은 section입니다. `level`은 HTML 제목 수준을 독립적으로 정합니다. [소유 계약과 작업 단계](product-workflow.md#작업-단계에-따른-중심) · [실제 Usage](../../../site/src/routes/ui-primitives-catalog/ProductWorkflowSpecimen.tsx).

## 인물·일정·파일 조합

`PersonCard(props: PersonCardProps)`, `EventCard(props: EventCardProps)`, `FileCard(props: FileCardProps)`는 package root의 공개 API입니다. 공통 DomainCardProps 및 각 필드 계약·배치 이유·실제 Usage는 [Domain cards](domain-cards.md#인물일정파일과-경계-선택)를 참고하세요. `ContentCardProps.boundary?: "outline" | "surface"`는 독립 단위를 외곽선 또는 면으로 구분합니다. 기본값은 outline입니다.

## ElapsedTime

`ElapsedTime({startedAt, endedAt?, label?})`는 Host가 제공한 epoch millisecond 시각으로 경과 시간을 `m:ss`로 표시합니다. startedAt은 필수 number, endedAt은 종료 시각 number, label 기본값은 경과 시간입니다. 실행 중 매초 현재 시각을 다시 읽고 종료 시각이 있으면 타이머를 정리해 소요 시간을 고정합니다. tick 개수를 누적하지 않아 비활성 탭 이후에도 실제 경과 시각으로 복원합니다. 역할은 timer이며 aria-live=off로 매초 읽기를 강제하지 않습니다. 작업 시작·완료·취소와 예상 종료 시각은 소유하지 않습니다.

[실제 Usage](/demo/ui-primitives#design-system-wait-animations)의 AI 작업 예제에서 완료/재시작을 조작합니다. 구현 Source는 `src/elapsed-time.tsx`에 등록되어 있습니다. 진행률 LoadingBar와 실제 단계 Stepper를 타이머와 별도로 조합합니다. 타이머만으로 완료 비율이나 단계 완료를 추정하지 않습니다.

ElapsedTime 브라우저 확인: 실제 표시가 0:06→0:17로 증가한 뒤 완료 조작 시 0:17로 고정됐고, 다른 단계 조작 이후에도 유지됐습니다. 카탈로그의 펼친 Stepper는 요청 확인 완료→자료 조회 진행→브리핑 작성 대기를 표시했습니다. 불확정 LoadingBar에는 aria-valuenow가 없음을 확인했습니다. 이 검증은 Chrome의 MOCK Usage에 한정하며 실제 AI 실행·재연결·모든 소비자 회귀를 입증하지 않습니다. 자동 검사는 shared-worktree-dev 흐름에 따라 수행하지 않았습니다.

`TaskCardProps.flagged?: boolean`은 실제 중요 표시를 깃발로 읽습니다. 완료·기한 초과·우선순위와 독립된 사실입니다. 동작이나 우선순위 전이를 추정하지 않습니다. [필드 매핑과 Usage](domain-cards.md#콘텐츠별-단서와-읽기-영역)를 참고하세요. SemanticIconKind에 event/location/participants/email/file이 추가되었으며 실제 의미와 맞을 때 사용합니다.


## 데이터 표현의 직접 입력과 복수 분류

- `NumberField({label,value,onValueChange,min?,max?,precision?,unit?,required?,disabled?})`: `value`와 콜백은 `number|null`. 정확한 숫자를 직접 입력하고 잘못된 초안은 유지한다. 허용 범위·최대 소수 자릿수를 위반하면 aria-invalid와 설명을 제공하며 값은 반영하지 않는다. 빈 값은 null이며 required이면 반영하지 않는다. 통화의 반올림·환전·정밀도 정책을 추측하지 않는다. `ValueInput`의 슬라이더/증감과 구분한다.
- `Tag({children})`: 비조작 분류 표시. 상태는 StatusBadge가 소유한다.
- `TagOption`: `{id,label,disabled?}`. `TagGroup({label,items,emptyLabel?})`는 읽기 목록, `TagPicker({label,options,value,onValueChange,disabled?})`는 기존 Check로 복수 포함·제외를 조작한다. value는 ID 배열이다.
- `DateRangeDisplay({start,end,startLabel?,endLabel?})`: 두 DateDisplay를 하나의 기간으로 읽는다. 날짜 포맷은 기존 Calendar/Host 정책이 제공한다.
- `RecordFacts({items,label?,presentation?})`: `presentation="grid"|"list"`, 기본 grid. PropertyEditor와 detail-list는 이 정본을 소비한다. 값 슬롯에 기존 입력을 주입할 수 있으나 목록은 편집·저장 정책을 소유하지 않는다.
- `RecordFact.actions?: ReactNode`는 해당 값에 적용되는 기존 변경·이동 컨트롤을 연결한다. 읽기 값과 명령을 구별하고 같은 행에서 정렬한다.
- `StatusBadge.tone`은 neutral/active/success/attention. attention은 기존 accent 토큰과 실제 경고·차단 의미를 사용하며 새 팔레트 토큰을 만들지 않는다.
- `PersonOption.description?`은 동명이인의 팀 등 실제 식별 맥락이다. ID와 표시 이름을 별도로 보존한다.
- `CommentComposer.disabled?`는 연결·권한·대기 상태를 반영한다. 실패한 제출은 기존 초안을 보존한다.

[계약과 실제 Usage](data-presentation.md). 공개 소스 등록은 NumberField→number-field.tsx, Tag/TagGroup/TagPicker→tags.tsx, DateRangeDisplay→record-identity.tsx다.

## 페이지와 탐색

`PageHeader`, `PageHeaderProps`, `SidebarNavigation`, `NavigationItem`,
`NavigationGroup`, `NavigationLinkRenderer`, `Breadcrumbs`, `BreadcrumbItem`,
`linkPresentation`의 계약과 실제 사이트 Usage는 [페이지와 탐색](page-navigation.md)에 있습니다.

`contentPresentation`은 기존 제목·본문·목록에 더해 `table`, `tableViewport`,
`tableHead`, `tableCell`, `quote`, `image`, `focus`를 제공합니다. 정적 표는 native table 의미를
보존하고, `role="grid"`인 편집 표는 같은 셀 토큰에서 경계를 추가합니다.
`SelectableItem.presentation="row"`는 탐색 목록 행의 padding·선택·focus 표현을
소유합니다. 자유 배치 surface의 기본 표현은 바꾸지 않습니다.

`ContentCardProps`는 `title`을 제외한 article의 HTML 속성을 받아 `aria-label`,
`id`, `className`을 실제 article에 전달합니다. A2UI Card도 이 정본을 소비합니다.
`Search.inputProps.disabled`는 native input의 비활성 상태를 전달합니다.

Menu·Choice·Popover·Dialog의 떠 있는 표면은 `floatingSurface.panel`을 사용합니다.
Popover의 기본 위치는 trigger 아래 8px이며 Host는 위치·너비·높이만 조합합니다.
DisclosureButton은 펼침 chevron을 소유하므로 소비자가 화살표를 덧붙이지 않습니다.

## `CodeBlock` / `InlineCode`

`CodeBlock({source, language?, label?, size?, codeRef?, preProps?, renderLine?, children?, meta?, signal?})`은 코드 표면·복사 명령·줄 번호를 소유한다. 구문 강조는 `renderLine`, 구조화된 문서 노드는 `children`과 `preProps`, 문서 선택 binding은 `codeRef`로 주입한다. `size`는 기존 compact/content/standard/tall 읽기 영역이다. `InlineCode`는 본문 내 코드 표현이다.

[문서와 JSON 실제 Usage](/demo/composer) · [문서 Source Usage](/docs/ui-primitives). 사이트 CodeBlock은 syntax policy와 canonical virtual-selection hook만 연결한다. RichText의 읽기 codeBlock도 같은 CodeBlock을 소비하며 node 속성과 selection은 보존한다.

`WaveDots({announce?,label?,frame?,...spanProps})`는 세 점 대기 표시의 정본이다. `ChatActivity`가 이를 조합하고 animation 패키지는 같은 export를 다시 제공한다. `chat-bubble.css`에 하나의 reduced-motion 규칙을 둔다.

`FieldPresentation`은 `heading?: ReactNode`, `disabled?: boolean`도 받는다. EditableText는 이 전환·focus 경계를 사용하고 draft·identity·저장/취소만 소유한다. `Avatar.fallback?: ReactNode`는 사람/에이전트의 기존 fallback을 주입한다. `Tag`는 span 속성을 받아 멘션 원자의 기존 contentEditable·node ID·focus 상태를 보존한다.

Popover·Menu·Choice popup은 내부 `usePopup`의 외부 클릭·Escape·초기 focus·복귀를 공유한다. menu/listbox/dialog의 역할과 선택 정책은 각각 유지한다. DatePicker/DateRangePicker는 Popover를 조합한다.
