import {DataPresentationPair} from "./DataPresentationPair";
import {useState} from "react";
import {dataPresentationCatalog, SidebarNavigation, Search, RecordFacts, ContentGroup, type DataPresentationRole, contentPresentation} from "@interactive-os/json-document-ui-primitives-react";
/** Fixtures map projected domain values to canonical read/edit slots; save policy is explicit. */
export function DataPresentationSpecimen() {
  const [role,setRole]=useState<DataPresentationRole>(()=>dataPresentationCatalog.find(entry=>entry.id===(typeof window==="undefined"?null:new URL(window.location.href).searchParams.get("data")))?.id ?? "date");
  const [query,setQuery]=useState("");
  const entry=dataPresentationCatalog.find(entry=>entry.id===role)!;
  const matches=dataPresentationCatalog.filter(entry=>`${entry.data} ${entry.schemaRoles.join(" ")}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const groups = [
    {id:"identity",label:"이름과 설명",roles:["title","description","identifier"]},
    {id:"state",label:"상태와 관계",roles:["status","priority","severity","person","category","tags"]},
    {id:"value",label:"시간과 수치",roles:["date","date-range","quantity","money"]},
    {id:"composition",label:"정보 묶음",roles:["properties","collection","comparison","activity","result"]},
  ];
  return <div className="grid items-start border-t border-line-subtle lg:grid-cols-[16rem_minmax(0,1fr)]">
    <aside className="grid min-w-0 content-start gap-group py-group lg:border-r lg:border-line-subtle lg:pr-group" aria-label="데이터 표현 탐색">
      <Search label="데이터 표현 찾기" query={query} onQueryChange={setQuery}/>
      <SidebarNavigation label="데이터 의미" currentId={role} onNavigate={id=>{setRole(id as DataPresentationRole);const url=new URL(window.location.href);url.searchParams.set("data",id);window.history.replaceState(null,"",url);}} groups={groups.map(group=>({id:group.id,label:group.label,items:matches.filter(item=>group.roles.includes(item.id)).map(item=>({id:item.id,label:item.data,href:`#data-${item.id}`}))})).filter(group=>group.items.length>0)} />
      {!matches.length&&<p role="status" className={contentPresentation.caption}>표현을 찾을 수 없습니다.</p>}
    </aside>
    <div className="grid min-w-0 content-start gap-region border-t border-line-subtle py-group lg:border-t-0 lg:pl-region">
      <header className={contentPresentation.group}><h3 className={contentPresentation.heading}>{entry.data}</h3><p className={contentPresentation.caption}>스키마 역할 · {entry.schemaRoles.join(" · ")}</p></header>
      <DataPresentationPair key={role} role={entry.id} readApi={entry.read.api} writeApi={entry.write?.api}/>
      <ContentGroup label="적용 기준" relationship="group"><h4 className={contentPresentation.itemTitle}>적용 기준</h4><RecordFacts items={[{id:"entry",label:"편집 진입",value:entry.entry},{id:"commit",label:"반영 방식",value:entry.commit}]}/></ContentGroup>
    </div>
  </div>;
}
