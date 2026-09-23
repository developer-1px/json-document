/** Read-only structural Node boundary; Web declarations remain consumable without lib.dom. */
export interface WebHTMLNode {
  readonly nodeType: number;
  readonly textContent: string | null;
  readonly childNodes: ArrayLike<WebHTMLNode>;
}
export interface WebHTMLFragment { readonly childNodes: ArrayLike<WebHTMLNode> }

/** Parses clipboard HTML in a template's inert document. Never append the returned nodes to a live document. */
export function parseWebHTMLFragment(html: string): WebHTMLFragment | null {
  if (html.length === 0 || typeof document === "undefined") return null;
  const template = document.createElement("template");
  template.innerHTML = html;
  // Projection input, not a general-purpose HTML sanitizer or an insertion-ready DOM tree.
  for (const element of Array.from(template.content.querySelectorAll("script,style,noscript,iframe,object,embed,template,svg,math,link,meta,base,title"))) element.remove();
  return template.content;
}
