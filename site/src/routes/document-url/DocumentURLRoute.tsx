import { useState } from "react";
import { resolveDocumentURL } from "@interactive-os/json-document-url";
import { resolveRichTextLinkURL } from "@interactive-os/json-document-rich-text";
import { Field } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader } from "../../shared/ui/primitives";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";

export function DocumentURLRoute() {
  const [value, setValue] = useState("notes/page");
  const results = [
    ["일반 링크", resolveDocumentURL(value, {schemes:["http","https","mailto","tel"],relative:"any",controlCharacters:"ignore-for-scheme"})],
    ["이미지", resolveDocumentURL(value, {schemes:["http","https"],relative:"any",controlCharacters:"ignore-for-scheme"})],
    ["Rich Text 링크", resolveRichTextLinkURL(value)],
  ];
  return <DemoPage documentation={<PageHeader title="문서 URL 허용 정책">같은 URL을 링크·이미지·Rich Text에 적용한 결과입니다. 허용한 원문은 그대로 유지합니다. notes/page, ../notes, mailto:a@example.test를 비교해 보세요.</PageHeader>}>
    <div className="mx-auto grid max-w-3xl gap-6 py-6">
      <Field label="문서 URL" value={value} onValueChange={setValue} />
      <table className="w-full text-left"><thead><tr><th scope="col">대상</th><th scope="col">결과</th></tr></thead>
        <tbody>{results.map(([name,result]) => <tr key={name}><th scope="row" className="py-2 font-normal">{name}</th><td><output aria-label={name}>{result === undefined ? "거절" : result}</output></td></tr>)}</tbody>
      </table>
    </div>
  </DemoPage>;
}
