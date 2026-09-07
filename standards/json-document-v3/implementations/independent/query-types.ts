import type { JSONPathJS } from "jsonpath-js";

type Query = JSONPathJS["rootNode"];
type Segment = Query["segments"][number];
type Filter = Extract<Exclude<Segment, { type: "DescendantSegment" }>[number], { type: "FilterSelector" }>;
type Expression = Filter["expr"];
type FunctionExpression = Extract<Extract<Expression, { type: "TestExpr" }>["query"], { type: "FunctionExpr" }>;
type Node = Expression | FunctionExpression["args"][number];
type ExpressionType = "value" | "logical" | "nodes" | "singular";

const functions: Readonly<Record<string, { readonly args: readonly ExpressionType[]; readonly result: ExpressionType }>> = {
  length: { args: ["value"], result: "value" },
  count: { args: ["nodes"], result: "value" },
  value: { args: ["nodes"], result: "value" },
  match: { args: ["value", "value"], result: "logical" },
  search: { args: ["value", "value"], result: "logical" },
};

/** RFC 9535 §2.4 static typing, independent of document contents/evaluation. */
export function validateQueryTypes(query: Query): void {
  expressionType(query);
}

function requireType(actual: ExpressionType, expected: ExpressionType): void {
  if (actual === expected || actual === "singular"
    || (expected === "logical" && actual === "nodes")) return;
  throw new SyntaxError(`JSONPath ${actual} expression cannot be used as ${expected}`);
}

function expressionType(node: Node): ExpressionType {
  switch (node.type) {
    case "Literal": return "value";
    case "Root":
    case "CurrentNode": {
      for (const segment of node.segments) {
        const selectors = Array.isArray(segment) ? segment : segment.selectors;
        for (const selector of selectors) {
          if (selector.type === "FilterSelector") requireType(expressionType(selector.expr), "logical");
        }
      }
      return node.segments.every((segment) => Array.isArray(segment) && segment.length === 1
        && ["NameSelector", "MemberNameShorthand", "IndexSelector"].includes(segment[0]!.type))
        ? "singular" : "nodes";
    }
    case "TestExpr":
      requireType(expressionType(node.query), "logical");
      return "logical";
    case "ComparisonExpr":
      requireType(expressionType(node.left), "value");
      requireType(expressionType(node.right), "value");
      return "logical";
    case "LogicalBinary":
      requireType(expressionType(node.left), "logical");
      requireType(expressionType(node.right), "logical");
      return "logical";
    case "LogicalUnary":
      requireType(expressionType(node.expr), "logical");
      return "logical";
    case "FunctionExpr": {
      const signature = Object.hasOwn(functions, node.name) ? functions[node.name] : undefined;
      if (signature === undefined || node.args.length !== signature.args.length) {
        throw new SyntaxError(`invalid JSONPath function signature: ${node.name}`);
      }
      node.args.forEach((arg, index) => requireType(expressionType(arg), signature.args[index]!));
      return signature.result;
    }
  }
}
