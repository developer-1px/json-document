import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { CodeBlock, InlineCode } from "../../src/shared/ui/code-block";
import { codeLanguage, tokenizeCodeLine } from "../../src/shared/ui/code-tokens";
import { MarkdownViewer } from "../../src/routes/docs/MarkdownViewer";

afterEach(cleanup);

describe("shared code language", () => {
  test("preserves block text while keeping visual line numbers outside code semantics", () => {
    const source = 'const value = { title: "Draft", ready: true };\n// current';
    const { container } = render(<CodeBlock language="typescript" source={source} testId="code" />);

    expect([...container.querySelectorAll("[data-code-line]")].map((line) => line.textContent).join("\n")).toBe(source);
    expect(screen.getByTestId("code").textContent).toBe(source);
    expect(screen.getByTestId("code").querySelector('[data-line-number="1"]')?.textContent).toBe("");
    expect(screen.getByTestId("code").querySelector('[data-code-token="keyword"]')?.textContent).toBe("const");
    expect(screen.getByTestId("code").querySelector('[data-code-token="string"]')?.textContent).toBe('"Draft"');
    expect(screen.getByTestId("code").querySelector('[data-code-token="comment"]')?.textContent).toBe("// current");
  });

  test("maps Markdown fence aliases onto the restrained tokenizer", () => {
    expect(codeLanguage("ts")).toBe("typescript");
    expect(codeLanguage("tsx")).toBe("tsx");
    expect(codeLanguage("bash")).toBe("shell");
    expect(codeLanguage("unknown")).toBe("text");
    expect(tokenizeCodeLine("export const ready = true;", "typescript").map((token) => token.text).join(""))
      .toBe("export const ready = true;");
  });

  test("renders Markdown blocks and inline code through the same shared components", () => {
    render(<MarkdownViewer source={'Use `document.value`.\n\n```ts\nconst ready = true;\n```\n\n```txt\nroot\n└─ child\n```'} />);

    expect(screen.getByText("document.value").tagName).toBe("CODE");
    const typescript = screen.getByRole("figure", { name: "TypeScript" });
    const text = screen.getByRole("figure", { name: "Text" });
    expect(within(typescript).getByText("TypeScript").className).toBe("sr-only");
    expect(within(text).getByText("Text").className).toBe("sr-only");
    expect(within(typescript).getByRole("button", { name: "Copy" }).textContent).toBe("");
    expect(within(typescript).getByRole("button", { name: "Copy" }).querySelector("svg")).toBeTruthy();
    expect(within(typescript).getByText("const").getAttribute("data-code-token")).toBe("keyword");
    expect(text.querySelectorAll("[data-line-number]")).toHaveLength(2);
    expect(text.querySelector("pre > code")).toBeTruthy();
  });

  test("does not add line-number semantics to inline code", () => {
    const { container } = render(<InlineCode prompt>npm i package</InlineCode>);
    expect(container.querySelector("code")?.textContent).toBe("$ npm i package");
    expect(container.querySelector("[data-line-number]")).toBeNull();
  });
});
