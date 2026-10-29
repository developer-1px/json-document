import type { Element, Root, RootContent } from "hast";

/** Document headings own their following content, rather than spacing themselves with margins. */
export function documentSections() {
  return (tree: Root) => {
    const group = (nodes: RootContent[], level: "h2" | "h3"): RootContent[] => {
      const result: RootContent[] = [];
      let body: Element | undefined;
      for (const node of nodes) {
        if (node.type === "element" && node.tagName === level) {
          body = { type: "element", tagName: "div", properties: { className: ["grid", "gap-group"] }, children: [] };
          const section: Element = { type: "element", tagName: "section", properties: { className: ["grid", "content-start", "gap-related"], ariaLabelledBy: node.properties.id === undefined ? undefined : [node.properties.id] }, children: [node, body] };
          result.push(section);
        } else if (body) {
          body.children.push(node as Element["children"][number]);
        } else {
          result.push(node);
        }
      }
      if (level === "h2") {
        for (const node of result) {
          if (node.type === "element" && node.tagName === "section") {
            const content = node.children[1] as Element;
            content.children = group(content.children, "h3") as Element["children"];
          }
        }
      }
      return result;
    };
    const sections = group(tree.children, "h2");
    const firstSection = sections.findIndex(node => node.type === "element" && node.tagName === "section");
    const intro = firstSection < 0 ? sections : sections.slice(0, firstSection);
    tree.children = intro.length ? [{ type: "element", tagName: "div", properties: { className: ["grid", "gap-group"] }, children: intro as Element["children"] }, ...sections.slice(intro.length)] : sections;
  };
}
