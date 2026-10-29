export interface UIBuilderProjectLocation { readonly projectId:string; readonly example:string; readonly pageId:string|null; readonly storageKey:string; readonly url:string; }
/** Stable project/page identity is independent from fixture choice and local persistence implementation. */
export function resolveUIBuilderProjectLocation(input:string, createId:()=>string):UIBuilderProjectLocation {
  const url=new URL(input); const example=url.searchParams.get("example")??"";
  const fresh=url.searchParams.get("new")==="1";
  const requested=url.searchParams.get("project");
  const projectId=fresh ? createId() : requested || (example ? `legacy:${example}` : "legacy:default");
  if (!projectId || projectId.length>200) throw new Error("문서 ID를 확인해 주세요.");
  url.searchParams.set("project",projectId); url.searchParams.delete("new");
  const storageKey=projectId.startsWith("legacy:") ? projectId==="legacy:default" ? "json-document.ui-builder.v1" : `json-document.ui-builder.${projectId.slice(7)}.v1` : `json-document.ui-builder.project.${projectId}.v1`;
  return {projectId,example,pageId:url.searchParams.get("page"),storageKey,url:url.href};
}
export function uiBuilderPageLink(input:string,pageId:string):string {const url=new URL(input); url.searchParams.set("page",pageId);return url.href;}
export function newUIBuilderProjectLink(input:string,example=""):string {const url=new URL(input);url.searchParams.delete("project");url.searchParams.delete("page");url.searchParams.set("new","1");if(example)url.searchParams.set("example",example);else url.searchParams.delete("example");return url.href;}
