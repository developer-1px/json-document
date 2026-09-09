import { useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Check, Palette, Square, type LucideIcon } from "lucide-react";
import type { ObjectStyle, ObjectStyleSelection } from "@interactive-os/json-document-object-document";
import { Command, Field, Popover, Toggle, ToolbarGroup } from "@interactive-os/json-document-ui-primitives-react";

const colors = [
  ["검정", "#253044"], ["흰색", "#ffffff"], ["파랑", "#3b82f6"], ["빨강", "#ef4444"],
  ["주황", "#f59e0b"], ["초록", "#22c55e"], ["보라", "#a855f7"], ["투명", "transparent"],
] as const;
const alignments: ReadonlyArray<{ readonly value: ObjectStyle["textAlign"]; readonly label: string; readonly icon: LucideIcon }> = [
  { value: "left", label: "왼쪽 정렬", icon: AlignLeft }, { value: "center", label: "가운데 정렬", icon: AlignCenter }, { value: "right", label: "오른쪽 정렬", icon: AlignRight },
];

/** Selection-only UI; the Document Type owns supported properties and mixed values. */
export function CanvasStyleControls(props: {
  readonly value: ObjectStyleSelection;
  readonly onStyle: (style: Partial<ObjectStyle>) => { readonly ok: boolean };
  readonly onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const value = props.value;
  if (Object.keys(value).length === 0) return null;
  const apply = (style: Partial<ObjectStyle>) => props.onStyle(style).ok;
  return <Popover label="스타일" trigger={<Palette aria-hidden="true" size={16} />} triggerPresentation="icon"
    open={open} onOpenChange={(next) => { if (next) props.onOpen(); setOpen(next); }} panelClassName="canvas-style-panel">
    {value.color !== undefined && <StyleValue key={`color:${value.color}`} label="색상" value={value.color} color onApply={(color) => apply({ color })} />}
    {value.strokeColor !== undefined && <StyleValue key={`stroke:${value.strokeColor}`} label="테두리 색" value={value.strokeColor} color
      onApply={(strokeColor) => apply({ strokeColor, ...(value.strokeWidth === 0 && strokeColor !== "transparent" ? { strokeWidth: 2 } : {}) })} />}
    {value.fontSize !== undefined && <StyleValue key={`size:${value.fontSize}`} label="글자 크기" value={value.fontSize} onApply={(fontSize) => apply({ fontSize: Number(fontSize) })} />}
    {value.strokeWidth !== undefined && <StyleValue key={`width:${value.strokeWidth}`} label="선 굵기" value={value.strokeWidth} onApply={(strokeWidth) => apply({ strokeWidth: Number(strokeWidth) })} />}
    {value.fontWeight !== undefined && <ToolbarGroup label="글자 서식">
      <Toggle label={value.fontWeight === null ? "굵게: 혼합" : "굵게"} pressed={value.fontWeight === 700} onClick={() => apply({ fontWeight: value.fontWeight === 700 ? 400 : 700 })}><Bold aria-hidden="true" size={16} /></Toggle>
      {alignments.map(({ value: alignment, label, icon: Icon }) => <Toggle key={alignment} label={label} pressed={value.textAlign === alignment} onClick={() => apply({ textAlign: alignment })}><Icon aria-hidden="true" size={16} /></Toggle>)}
      {value.textAlign === null && <span>정렬: 혼합</span>}
    </ToolbarGroup>}
  </Popover>;
}

function StyleValue(props: {
  readonly label: string;
  readonly value: string | number | null;
  readonly color?: boolean;
  readonly onApply: (value: string) => boolean;
}) {
  const [draft, setDraft] = useState(props.value === null ? "" : String(props.value));
  const [error, setError] = useState<string | null>(null);
  function apply() {
    const value = draft.trim();
    if (!value || (props.color && !CSS.supports("color", value))) { setError(props.color ? "유효한 색상을 입력하세요." : "값을 입력하세요."); return; }
    if (props.onApply(value)) setError(null);
  }
  return <div style={{ display: "grid", gap: 4 }}>
    <span>{props.label}</span>
    {props.color && <ToolbarGroup label={`${props.label} 팔레트`} style={{ flexWrap: "wrap" }}>
      {colors.map(([label, color]) => <Toggle key={color} label={`${props.label}: ${label}`} pressed={props.value === color} onClick={() => { props.onApply(color); setDraft(color); setError(null); }}>
        <Square aria-hidden="true" size={16} fill={color} stroke={color === "transparent" || color === "#ffffff" ? "currentColor" : color} />
      </Toggle>)}
    </ToolbarGroup>}
    <form style={{ display: "flex", gap: 4 }} onSubmit={(event) => { event.preventDefault(); apply(); }}>
      <Field label={props.label} value={draft} {...(props.value === null ? { placeholder: "혼합" } : {})} inputMode={props.color ? "text" : "decimal"}
        onKeyDown={(event) => { if (event.nativeEvent.isComposing) { if (event.key === "Enter") event.preventDefault(); event.stopPropagation(); } }}
        aria-invalid={error !== null} onValueChange={(value) => { setDraft(value); setError(null); }} style={{ width: "100%", minWidth: 0 }} />
      <Command label={`${props.label} 적용`} type="submit"><Check aria-hidden="true" size={16} /></Command>
    </form>
    {error && <span role="alert">{error}</span>}
  </div>;
}
