import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(siteRoot, "..");
const fixtureRoot = path.join(siteRoot, "scripts/fixtures");

const forbidden = [
  { name: "native Date", pattern: /\bnew\s+Date\s*\(/g },
  { name: "civil millisecond constant", pattern: /\b(?:DAY_MS|MINUTE_MS|86_?400_?000|60_?000)\b/g },
  { name: "manual year increment", pattern: /Number\([^\n]*slice\(0,\s*4\)[^\n]*\)\s*[+-]/g },
  { name: "manual month projection", pattern: /index\s*\+\s*1[^\n]*padStart\(2,\s*["']0["']\)/g },
];

export function calendarTemporalViolations(source, file = "source") {
  return forbidden.flatMap(({ name, pattern }) => (
    [...source.matchAll(pattern)].map((match) => `${file}: ${name}: ${match[0]}`)
  ));
}

const badFixture = fs.readFileSync(path.join(fixtureRoot, "calendar-temporal-violation.txt"), "utf8");
const goodFixture = fs.readFileSync(path.join(fixtureRoot, "calendar-temporal-conforming.txt"), "utf8");
const badViolations = calendarTemporalViolations(badFixture, "violation fixture");
if (!forbidden.every(({ name }) => badViolations.some((violation) => violation.includes(`: ${name}:`)))) {
  throw new Error(`Calendar Temporal guard did not reject every violation category (${badViolations.length} findings).`);
}
if (calendarTemporalViolations(goodFixture, "conforming fixture").length !== 0) {
  throw new Error("Calendar Temporal guard rejected its conforming Temporal fixture.");
}

const files = [
  ...collect(path.join(repositoryRoot, "packages/json-document-editing/src"), /^calendar.*\.ts$/),
  ...collect(path.join(repositoryRoot, "packages/json-document-calendar/src"), /\.[jt]sx?$/),
  path.join(repositoryRoot, "packages/json-document-calendar/src/date-values.ts"),
  path.join(repositoryRoot, "packages/json-document-calendar/src/date-controls.tsx"),
  path.join(repositoryRoot, "packages/json-document-web/src/calendar-input.ts"),
  ...collect(path.join(siteRoot, "src/routes/calendar-demo"), /\.[jt]sx?$/),
];
const violations = files.flatMap((file) => calendarTemporalViolations(
  fs.readFileSync(file, "utf8"),
  path.relative(repositoryRoot, file),
));

if (violations.length > 0) {
  console.error("Calendar civil date/time must use Temporal directly:");
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exitCode = 1;
} else {
  console.log(`Calendar Temporal guard ok; ${files.length} runtime files checked; bad/good fixtures verified.`);
}

function collect(directory, pattern) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(entryPath, pattern);
    return pattern.test(entry.name) ? [entryPath] : [];
  });
}
