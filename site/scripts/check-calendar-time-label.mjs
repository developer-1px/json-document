import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const owner = read("packages/json-document-ui-primitives-react/src/date-values.ts");
const ownerIndex = read("packages/json-document-ui-primitives-react/src/index.ts");
const host = read("site/src/routes/calendar-demo/CalendarDemoRoute.tsx");

requireText(owner, "calendarTimeLabel");
requireText(owner, "Temporal.PlainDateTime.from(parsed).toPlainTime()");
requireText(ownerIndex, "calendarTimeLabel");
requireCount(host, "calendarTimeLabel(", 3);
forbid(host, /function clockLabel/);
forbid(host, /slice\(11, 16\)/);

console.log("Calendar time label guard ok; UI Primitives owner and three Host consumers checked.");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireText(source, text) {
  if (!source.includes(text)) throw new Error(`Calendar 시간 문구 정본 연결이 없습니다: ${text}`);
}

function requireCount(source, text, expected) {
  const actual = source.split(text).length - 1;
  if (actual !== expected) throw new Error(`Calendar 시간 문구 소비 수가 다릅니다: ${text}, expected=${expected}, actual=${actual}`);
}

function forbid(source, pattern) {
  if (pattern.test(source)) throw new Error(`Calendar Host에 시간 문구 projection이 다시 생겼습니다: ${pattern}`);
}
