import { useState } from "react";
import { uiComponentAuthoringCatalog, type UIComponentKind } from "@interactive-os/json-document-object-document";
import { Choice, Command, Search } from "@interactive-os/json-document-ui-primitives-react";
const categoryLabels: Readonly<Record<string,string>> = {content:"콘텐츠·데이터",control:"입력·행동",composition:"작업 공간·오버레이",calendar:"날짜·일정",feedback:"대기·상태"};
/** Authoring and AI use the same registered vocabulary and task mapping. */
export function UIBuilderComponentPalette({onAdd}: {readonly onAdd:(kind:UIComponentKind)=>void}) {
  const [query,setQuery] = useState(""); const [category,setCategory] = useState("");
  const entries = uiComponentAuthoringCatalog.filter(entry => (!category || entry.category === category) && `${entry.label} ${entry.id} ${entry.mapping}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <div className="ui-builder-catalog-palette"><Search label="컴포넌트 찾기" query={query} onQueryChange={setQuery} /><Choice label="컴포넌트 범주" presentation="popup" value={category} options={[{id:"",label:"전체"},...Object.entries(categoryLabels).map(([id,label])=>({id,label}))]} onValueChange={setCategory} /><div className="ui-builder-catalog-entries">{entries.map(entry=><Command key={entry.id} onClick={()=>onAdd(entry.id)} aria-description={entry.mapping}>{entry.label}</Command>)}</div>{entries.length===0 && <p role="status">일치하는 컴포넌트가 없습니다.</p>}</div>;
}
