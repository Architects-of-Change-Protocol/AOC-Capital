import { execSync } from "node:child_process";
const commands = ["npm run build", "npm test", "npm run check:governance", "node scripts/run-launch-smoke-tests.mjs", "node scripts/runtime-diagnostics-report.mjs"];
const results = [];
for (const cmd of commands) {
  try { execSync(cmd, { stdio: "pipe" }); results.push({ cmd, status: "pass" }); }
  catch (e) { results.push({ cmd, status: "fail", error: e.message }); }
}
console.log(JSON.stringify({ category: "Launch Readiness", results }, null, 2));
if (results.some((r) => r.status === "fail")) process.exit(1);
