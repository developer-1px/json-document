// Data meaning and read/write presentation contracts. Domain schemas remain with their owners.
export {dataPresentationCatalog, getDataPresentation, type DataPresentationRole} from "./data-presentation.js";
export {FieldPresentation} from "./field-presentation.js";
export {FormField, type FormFieldProps, type FormFieldControlProps} from "./form-field.js";

// Read: identity, dates, state, independent content and results.
export {QuantityDisplay, MoneyDisplay} from "./numeric-presentation.js";
export {contentPresentation} from "./content-presentation.js";
export {CodeBlock, InlineCode, type CodeBlockProps} from "./code-block.js";
export {ContentGroup, type ContentRelationship} from "./content-group.js";
export {Avatar, PersonIdentity, PriorityIndicator, DateDisplay, DateRangeDisplay} from "./record-identity.js";
export {Tag, TagGroup, TagPicker, type TagOption} from "./tags.js";
export {NumberField, type NumberFieldProps} from "./number-field.js";
export {ElapsedTime} from "./elapsed-time.js";
export {StatusBadge, IssueRow, PropertyEditor, ResultPanel, type StatusBadgeTone, type IssueRowProps, type IssueRowSelection, type PropertyEditorItem} from "./record-presentation.js";
export {ContentCard, type ContentCardProps} from "./content-card.js";
export {PersonCard, EventCard, FileCard, type PersonCardProps, type EventCardProps, type FileCardProps, InquiryCard, TaskCard, ProductCard, ApprovalCard, ActivityCard, EvidenceCard, type DomainCardProps, type InquiryCardProps, type TaskCardProps, type ProductCardProps, type ApprovalCardProps, type ActivityCardProps, type EvidenceCardProps} from "./domain-cards.js";
export {Stepper, ActivityFeed, type WorkflowStep, type ActivityEntry} from "./workflow-history.js";

// Write and select: drafts, actual value changes and record selection.
export {EditableText} from "./editable-text.js";
export {CommentComposer} from "./comment-composer.js";
export {PeoplePicker, type PersonOption} from "./people-picker.js";
export {Check, Field, Search, ValueInput, fieldPresentation} from "./input-controls.js";
export {Choice, type ChoiceClassNames, type ChoiceOption, type ChoiceProps} from "./choice.js";
export {useListbox, type ListboxBinding, type ListboxItem, type UseListboxOptions} from "./listbox.js";

// Product actions, navigation and composition.
export {Command, DisclosureButton, SelectableItem, Tabs, Toggle, type CommandKind, type TabOption, type SelectableItemProps} from "./controls.js";
export {PageHeader, SidebarNavigation, Breadcrumbs, linkPresentation, type PageHeaderProps, type NavigationItem, type NavigationGroup, type NavigationLinkRenderer, type BreadcrumbItem} from "./page-navigation.js";
export {FilterBar, type AppliedFilter} from "./filter-bar.js";
export {RecordWorkspace} from "./record-workspace.js";
export {ProductCanvas, ProductInspector, ProductShell} from "./product-shell.js";
export {Toolbar, ToolbarGroup, ToolbarLayout, ToolbarRegion, ToolbarSeparator, ToolbarSpacer, type ToolbarRegionPlacement} from "./toolbar.js";
export {Menu, type MenuItem, type MenuProps} from "./menu.js";
export {ContextualControls} from "./contextual-controls.js";

// Transient state and overlay surfaces.
export {EmptyState, InlineAlert, ExecutionFeedback, Toast} from "./workflow-feedback.js";
export {ChatActivity, ChatBubble, WaveDots, type ChatBubbleProps} from "./chat-bubble.js";
export {Dialog, Popover} from "./presentations.js";
export {floatingSurface} from "./floating-surface.js";

// Direct manipulation and interaction contracts.
export {ControlHandle, DragHandle, FileDropRegion, GridCell, ResizeHandle, useInteractionHandle} from "./surfaces.js";
export type {ControlHandleProps, DragHandleProps, InteractionHandleBindingOptions, InteractionHandleButtonProps, ResizeHandleProps} from "./surfaces.js";
export type {ControlAffordance, ControlAffordanceProps} from "./control-affordance.js";
export {contentInteractionAttributes, type ContentInteractionAttributes, type ContentInteractionInput} from "./content-interaction.js";

export {RecordDetail, RecordContext, RecordFacts, type RecordDetailProps, type RecordContextProps, type RecordFact, SemanticIcon, StateIndicator, RecordSummary, MessageThread, ChangeComparison, type SemanticIconKind, type StateIndicatorState, type RecordSummaryProps, type ThreadMessage, type ComparedField} from "./record-affordances.js";
