import {useState} from "react";
import {createSheetEditor,type SheetDocument} from "@interactive-os/json-document-editing";
import {SheetHand} from "@interactive-os/json-document-sheet";
import {DemoPage} from "../../shared/demo-workbench/DemoPage";
import {PageHeader} from "../../shared/ui/primitives";

const sample:SheetDocument={
  columns:[{id:"name",label:"이름"},{id:"status",label:"상태"},{id:"owner",label:"담당"}],
  rows:[
    {id:"alpha",cells:{name:"Alpha",status:"초안",owner:"민아"}},
    {id:"beta",cells:{name:"Beta",status:"검토",owner:"태오"}},
    {id:"gamma",cells:{name:"Gamma",status:"완료",owner:"수진"}},
  ],
};

export function SheetViewsDemoRoute(){
  const [views]=useState(()=>{
    const source=createSheetEditor(sample,{structure:{minimumRows:1,minimumColumns:1}});
    return {left:source.createView(),right:source.createView({rowOrder:["gamma","beta","alpha"],columnOrder:["owner","status","name"]})};
  });
  return <DemoPage documentation={<PageHeader illustration="database" title="하나의 표, 두 View">어느 쪽에서 편집해도 같은 셀에 즉시 반영됩니다. 선택과 표시 순서는 각 View가 유지하고 실행 취소는 공유합니다.</PageHeader>}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 28rem), 1fr))",gap:32}}>
      <section aria-label="기본 순서 View" style={{minWidth:0}}><h2>기본 순서</h2><SheetHand editor={views.left} label="기본 순서 표" profile="spreadsheet-grid" /></section>
      <section aria-label="다른 순서 View" style={{minWidth:0}}><h2>다른 순서</h2><SheetHand editor={views.right} label="다른 순서 표" profile="document-table" /></section>
    </div>
  </DemoPage>;
}
