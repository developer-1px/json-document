import { createUIBuilderEditor, applyUIBuilderMaterials, applyUIBuilderPages, applyUIBuilderComponentConfiguration, applyUIBuilderConfiguration, getUIBuilderPageObjects, getUIBuilderRootObjects, readUIBuilderProject, type UIBuilderField } from "@interactive-os/json-document-editing";
import { createUIComponentObject, uiComponentAuthoringCatalog, type UIComponentContent, type UIComponentKind, type UIComponentObject } from "@interactive-os/json-document-object-document";
const labels:Readonly<Record<string,string>>={content:"콘텐츠·데이터",control:"입력·행동",composition:"작업 공간·오버레이",calendar:"날짜·일정",feedback:"대기·상태"};
/** Registration Usage is composed from public APIs, with meaningful local data and separate category pages. */
export function createFullCatalogExample() {
  const editor=createUIBuilderEditor({profile:"canvas/1",width:1200,height:1200,objects:[]});
  const ensure=(result:{ok:boolean;reason?:string})=>{if(!result.ok)throw new Error(result.reason??"카탈로그 예제 생성 실패");};
  const fields:readonly UIBuilderField[]=[{id:"title",name:"상품명",type:"title",options:[],sample:"auto"},{id:"state",name:"상태",type:"text",options:[],sample:"auto"},{id:"stock",name:"재고(개)",type:"number",options:[],sample:"auto"},{id:"price",name:"단가(원)",type:"number",options:[],sample:"auto"},{id:"result",name:"검토 결과",type:"text",options:[],sample:"auto"},{id:"owner",name:"담당자",type:"select",options:[{id:"person-cx",name:"김민지"},{id:"person-design",name:"김민지"}],sample:"auto"}];
  ensure(applyUIBuilderMaterials(editor,[{type:"table.save",id:"catalog-data",name:"상품 검토 MOCK",fields},{type:"action.save",action:{id:"catalog-complete",name:"예제 완료 표시",description:"로컬 예시의 상태를 완료로 표시합니다.",inputs:[fields[4]!],outputs:[fields[1]!],execution:{skill:"mock.complete",tableId:"catalog-data",prompt:"예제 완료",inputFieldIds:["result"],outputFieldIds:["state"],requiredFieldIds:["result"]}}}]));
  const table=readUIBuilderProject(editor.snapshot.value).tables[0]!;
  ensure(applyUIBuilderMaterials(editor,[{type:"table.data",id:table.id,data:{...table.data,records:[{id:"kb",values:{title:"무선 키보드",state:"품절",stock:0,price:59000,result:"재고 확인 완료",owner:"person-design"}},{id:"note",values:{title:"재활용 노트 A5 — 무지 · 80매 · 3권 묶음",state:"소량",stock:7,price:12000,result:"입고 계획 확인 필요",owner:"person-cx"}},{id:"hub",values:{title:"USB-C 허브",state:"판매 중",stock:128,price:39000,result:"정상 재고",owner:"person-design"}}]}}]));
  const categories=Object.keys(labels); const pages=categories.map(category=>category==="content"?"page:main":`catalog:${category}`);
  ensure(applyUIBuilderPages(editor,[{type:"page.rename",id:"page:main",name:labels.content!},...categories.slice(1).map(category=>({type:"page.create" as const,id:`catalog:${category}`,name:labels[category]!}))]));
  let y=0;
  const people=[{id:"person-cx",name:"김민지",description:"고객 경험"},{id:"person-design",name:"김민지",description:"제품 디자인"}];
  const add=(kind:UIComponentKind,text:string,items:readonly string[]=[])=>{const draft=createUIComponentObject(kind,{x:0,y},{text,items});if(draft.kind!=="embedded-document")throw new Error("컴포넌트 오류");y+=draft.height+24;ensure(editor.dispatch({type:"object.create",object:{...draft,document:{...(draft.document as UIComponentContent),pageId:readUIBuilderProject(editor.snapshot.value).activePageId}}}));return readUIBuilderProject(editor.snapshot.value).objects.at(-1)!.id;};
  const calendar={calendars:[{id:"team",title:"팀 일정",hidden:false,color:"#466378"}],events:[{id:"review",title:"제품 검토",start:"2026-10-13T10:00",end:"2026-10-13T11:00",allDay:false,calendarId:"team",recurrence:null,excludeDates:[]}]};
  for(const category of categories){y=0;ensure(applyUIBuilderPages(editor,[{type:"page.select",id:category==="content"?"page:main":`catalog:${category}`} ]));add("title",labels[category]!);const nav=add("tabs","카탈로그 범주",Object.values(labels));ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:nav,props:{pageIds:pages}}]));
    for(const entry of uiComponentAuthoringCatalog.filter(entry=>entry.category===category)){
      if(category==="feedback")add("caption",entry.label);
      const id=add(entry.id,entry.id === "input" ? "이메일" : entry.id === "textarea" ? "작업 메모" : entry.label,["첫 항목","둘째 항목"]);
      if(entry.id === "input" || entry.id === "textarea")ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,props:{required:entry.id === "input",description:entry.id === "input" ? "업무 연락에 사용할 주소입니다." : "완료한 내용이나 다음에 확인할 일을 기록하세요."}}]));
      if(entry.id==="record-card")ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,collection:{tableId:table.id,fieldIds:["title","state","stock","price","result"]},props:{presentation:"product",titleFieldId:"title",statusFieldId:"state",quantityFieldId:"stock",priceFieldId:"price",noteFieldId:"result",unit:"개",currency:"KRW"}}]));
      if(entry.id==="card"){
        const body=add("text","이 독립 카드의 본문입니다. 행동은 본문과 분리된 footer에서 실행합니다.");
        const action=add("page-link","입력·행동 보기");
        ensure(applyUIBuilderPages(editor,[{type:"page-link.target",id:action,targetPageId:"catalog:control"}]));
        ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,childIds:[body,action],props:{actionCount:1}}]));
      }
      if(entry.id==="button")ensure(editor.dispatch({type:"object.update",objectId:id,changes:{document:{...(readUIBuilderProject(editor.snapshot.value).objects.find(object=>object.id===id) as UIComponentObject).document,actionId:"catalog-complete"}}}));
      if(entry.id==="page-link")ensure(applyUIBuilderPages(editor,[{type:"page-link.target",id,targetPageId:"page:main"}]));
      if(entry.id==="menu")ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,props:{actionIds:["catalog-complete","catalog-complete"]}}]));
      if(entry.id==="sidebar-navigation")ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,props:{pageIds:pages.slice(0,2)}}]));
      if(entry.id==="people-picker"){
        ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,props:{people:{items:people}}}]));
        ensure(applyUIBuilderConfiguration(editor,{connections:[{objectId:id,actionId:"",bindings:[{target:"value",mode:"value",tableId:table.id,fieldId:"owner",recordId:"kb"}]}]}));
      }
      if(entry.id==="number-field"){
        ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,props:{min:0,precision:0,unit:"개"}}]));
        ensure(applyUIBuilderConfiguration(editor,{connections:[{objectId:id,actionId:"",bindings:[{target:"value",mode:"value",tableId:table.id,fieldId:"stock",recordId:"kb"}]}]}));
      }
      if(entry.id==="tag-picker")ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,props:{options:{items:[{id:"new",label:"신상품"},{id:"review",label:"검토 필요"}]},selectedIds:["review"]}}]));
      if(entry.id==="date-range-display")ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,props:{start:"2026-10-15",end:"2026-10-19"}}]));
      if(entry.id==="comment-composer"){
        const feed=add("activity-feed","작성한 기록");
        ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,props:{targetId:feed,actor:"김민지",submitLabel:"메모 저장"}},{objectId:feed,props:{entries:{items:[]}}}]));
      }
      if(entry.id==="activity-feed")ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,props:{entries:{items:[{id:"stock-check",actor:"김민지",action:"재고를 확인했습니다.",dateTime:"2026-10-14T10:00:00+09:00",timeLabel:"오늘 10:00",detail:"실제 MOCK 재고 확인 기록"}]}}}]));
      if(entry.id==="search")ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,props:{targetTableId:table.id,fieldId:"title"}}]));
      if(entry.id==="table"||entry.id==="detail-list"||entry.id==="record-list")ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,collection:{tableId:table.id,fieldIds:["title","state","stock","price"]},...(entry.id==="table"?{props:{editable:true}}:{})}]));
      if(["calendar-month","calendar-time","calendar-event-inspector"].includes(entry.id))ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,props:{...entry.defaultProps,calendar}}]));
      if(["page-header","empty-state","inline-alert","filter-bar","record-facts","property-editor","result-panel","group","product-shell","product-canvas","product-inspector","toolbar","toolbar-group","toolbar-layout","toolbar-region","contextual-controls","popover","dialog","disclosure"].includes(entry.id)){const child=add("text",`${entry.label}의 콘텐츠`);ensure(applyUIBuilderComponentConfiguration(editor,[{objectId:id,childIds:[child]}]));}
    }
    const p=readUIBuilderProject(editor.snapshot.value);const roots=getUIBuilderRootObjects(getUIBuilderPageObjects(p) as readonly UIComponentObject[]);
    ensure(applyUIBuilderConfiguration(editor,{flow:{rows:roots.map(object=>({columns:[{weight:1,items:[{objectId:object.id,size:"fill"}]}]}))}}));
  }
  ensure(applyUIBuilderPages(editor,[{type:"page.select",id:"page:main"}]));return createUIBuilderEditor(readUIBuilderProject(editor.snapshot.value));
}
