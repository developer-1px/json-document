import {useId, useState, type ReactNode} from "react";
import {Popover} from "./presentations.js";
import {Search} from "./input-controls.js";
import {useListbox} from "./listbox.js";
import {PersonIdentity} from "./record-identity.js";
import {floatingSurface} from "./floating-surface.js";
export interface PersonOption {readonly id: string; readonly name: string; readonly description?:string; readonly src?: string; readonly disabled?: boolean;}
/** Searchable person selection composed from the canonical popover and listbox lifecycles. */
export function PeoplePicker({label, people, value, onValueChange, disabled}: {readonly label: string; readonly people: readonly PersonOption[]; readonly value: string; readonly onValueChange: (id: string) => void; readonly disabled?: boolean}): ReactNode {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(value || null);
  const matches = people.filter(person => [person.name,person.description].filter(Boolean).join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const selected = people.find(person => person.id === value);
  const listbox = useListbox({id: `people-${id}`, label, items: matches.map(person => ({...person, textValue: person.name})), activeId, selectedId: value, onActiveChange: setActiveId, onAction: id => {onValueChange(id); setOpen(false);}});
  return <Popover label={label} disabled={disabled} trigger={selected ? <PersonIdentity name={selected.name} src={selected.src} /> : "담당자 선택"} open={open} onOpenChange={value => {setOpen(value); if (value) {setQuery(""); setActiveId(selected?.id ?? null);}}} panelClassName={floatingSurface.panel}>
    <div data-ui-component="people-picker"><Search inputProps={{"aria-controls": `people-${id}`, "aria-activedescendant": listbox.referenceProps["aria-activedescendant"], onKeyDown: event => {if (["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) listbox.referenceProps.onKeyDown(event);}}} label={`${label} 검색`} query={query} onQueryChange={next => {setQuery(next); setActiveId(null);}} />
      <div {...listbox.listboxProps} tabIndex={0}>{matches.map(person => <button key={person.id} {...listbox.optionProps({...person, textValue: person.name})}><PersonIdentity name={person.name} src={person.src} />{person.description && <span>{person.description}</span>}</button>)}</div>
      {!matches.length && <p role="status">검색 결과가 없습니다.</p>}
    </div>
  </Popover>;
}
