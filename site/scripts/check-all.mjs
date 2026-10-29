// Runs every site guard in one process and reports all failures before exiting.
const guards = [
  "./check-design-tokens.mjs",
  "./check-ui-language.mjs",
  "./check-canonical-icons.mjs",
  "./check-calendar-temporal.mjs",
  "./check-document-type-audits.mjs",
  "./check-canonical-bans.mjs",
];

let failed = false;
for (const path of guards) {
  const { default: check, message } = await import(path);
  let violations;
  try {
    violations = check();
  } catch (error) {
    violations = [error.message];
  }
  if (violations.length === 0) continue;
  failed = true;
  console.error(`\n${path}: ${message}`);
  for (const violation of violations) console.error(`- ${violation}`);
}

// Repository-owned architecture drift check; it reports and sets process.exitCode itself.
await import("../../scripts/check-architecture-drift.mjs");

if (failed || process.exitCode) process.exit(1);
console.log(`Site guards ok; ${guards.length} guards and architecture drift checked.`);
