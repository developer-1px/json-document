import { EditingControls, type EditingControlsProps } from "@interactive-os/json-document-ui-primitives-react";
import type { ObjectStyle, ObjectStyleSelection } from "@interactive-os/json-document-object-document";

/** Canvas policy for finite style choices. Arbitrary design changes belong to the request action. */
export function CanvasEditControls({ value, onStyle, onRequestEdit, children }: {
  readonly value: ObjectStyleSelection;
  readonly onStyle: (style: Partial<ObjectStyle>) => unknown;
  readonly onRequestEdit?: () => void;
  readonly children?: EditingControlsProps["children"];
}) {
  const choices: NonNullable<EditingControlsProps["choices"]>[number][] = [];
  if (value.fontSize !== undefined) choices.push({ id: "size", label: "글자 크기", value: String(value.fontSize),
    options: [{ id: String(value.fontSize), label: value.fontSize === null ? "크기 혼합" : `${value.fontSize}` }, { id: "18", label: "작게" }, { id: "28", label: "보통" }, { id: "40", label: "크게" }].filter((o, i, a) => a.findIndex(v => v.id === o.id) === i),
    renderValue: option => <span data-ui-editing-size><span aria-hidden="true">Aa</span> {option.id === "null" ? "—" : option.id}</span>,
    renderOption: option => <span data-ui-editing-option><span aria-hidden="true" style={{ fontSize: Math.min(24, Math.max(14, Number(option.id) / 2)) }}>Aa</span><span>{option.label}</span></span>,
    onValueChange: size => { if (size !== "null") onStyle({ fontSize: Number(size) }); } });
  const colorKey = value.textColor !== undefined ? "textColor" : value.color !== undefined ? "color" : undefined;
  if (colorKey) choices.push({ id: "color", label: colorKey === "textColor" ? "글자색" : "색상", value: String(value[colorKey]),
    options: [{ id: String(value[colorKey]), label: value[colorKey] === null ? "색상 혼합" : "선택한 색" }, { id: "#253044", label: "먹색" }, { id: "#ffffff", label: "흰색" }, { id: "#3b82f6", label: "파랑" }, { id: "#ef4444", label: "빨강" }].filter((o, i, a) => a.findIndex(v => v.id === o.id) === i),
    renderValue: option => <span data-ui-editing-swatch style={{ background: option.id === "null" ? undefined : option.id }} />,
    renderOption: option => <span data-ui-editing-option><span data-ui-editing-swatch style={{ background: option.id === "null" ? undefined : option.id }} /><span>{option.label}</span></span>,
    onValueChange: color => { if (color !== "null") onStyle({ [colorKey]: color }); } });
  return <EditingControls label="콘텐츠 편집" choices={choices}
    actions={value.fontWeight === undefined ? [] : [{ id: "emphasis", label: value.fontWeight === 700 ? "강조 해제" : "강조", onSelect: () => onStyle({ fontWeight: value.fontWeight === 700 ? 400 : 700 }) }]}
    {...(onRequestEdit ? { onRequestEdit } : {})}>{children}</EditingControls>;
}
