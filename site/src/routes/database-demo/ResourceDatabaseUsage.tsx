import {useState} from "react";
import {z} from "zod/v4";
import {Database, createDatabaseResource, createDatabaseView, useDatabase, type DatabaseOperations} from "@interactive-os/json-document-database";
import {ContentGroup, IssueRow, StatusBadge} from "@interactive-os/json-document-ui-primitives-react";

const schema = z.object({id:z.string(), title:z.string(), status:z.enum(["대기", "진행", "완료"])});
type Task = z.infer<typeof schema>;
const resource = createDatabaseResource<Task>({id:"record-panel-usage", schema, getRowId:row=>row.id, createDraft:()=>({title:"새 업무", status:"대기"})});
const view = createDatabaseView("tasks", "업무", ["title", "status"]);

/** An in-memory transport fixture. Resource validation and editing remain with Database. */
export function ResourceDatabaseUsage() {
  const [operations] = useState<DatabaseOperations<Task>>(() => {
    let rows:Task[] = [{id:"TEAM-101",title:"CSV 인코딩 확인",status:"진행"},{id:"TEAM-102",title:"배포 공지 준비",status:"대기"}];
    return {
      query:async()=>({rows:[...rows],total:rows.length}),
      create:async(input)=>{const row:Task={id:crypto.randomUUID(),title:input.title ?? "새 업무",status:input.status ?? "대기"}; rows=[row,...rows]; return {row};},
      delete:async(id)=>{rows=rows.filter(row=>row.id!==id);},
      update:async(id,patch)=>{const current=rows.find(row=>row.id===id); if (!current) throw new Error("업무를 찾지 못했습니다."); const row={...current,...patch,id}; rows=rows.map(item=>item.id===id?row:item); return {row};},
    };
  });
  return <Database.Provider resource={resource} operations={operations} defaultView={view} capabilities={{create:false,delete:false,configureView:false,saveView:false}}><ResourceRecords/></Database.Provider>;
}

function ResourceRecords() {
  const database = useDatabase<Task>();
  return <div className="grid items-start gap-region md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
    <ContentGroup label="업무 목록">{database.rows.map(row=><IssueRow key={row.id} title={row.title} identifier={row.id} status={<StatusBadge>{row.status}</StatusBadge>} selected={database.activeRow?.id===row.id} onSelect={()=>database.openRow(row)}/>)}<Database.StatusBar/></ContentGroup>
    <Database.RecordPanel/>
  </div>;
}
