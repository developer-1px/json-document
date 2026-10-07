export interface LocalMarkdownFile { name: string; source: string; version: string }
export interface LocalMarkdownDirectory { directory: string; files: string[] }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/local-markdown/${path}`, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "문서 파일 요청에 실패했습니다.");
  return result as T;
}
export const listLocalMarkdownFiles = () => request<LocalMarkdownDirectory>("");
export const readLocalMarkdownFile = (name: string) => request<LocalMarkdownFile>(encodeURIComponent(name));
export const saveLocalMarkdownFile = (name: string, source: string, version: string | null) => request<LocalMarkdownFile>(encodeURIComponent(name), {
  method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source, version }),
});
