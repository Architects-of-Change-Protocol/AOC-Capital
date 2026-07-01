import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src/lib", "src/app/api", "src/sdk"];
const BLOCK_PATTERNS = [
  { name: "local runtime decision interface", re: /interface\s+\w*(Runtime|Governance)Decision\w*/g },
  { name: "local decision envelope type", re: /type\s+\w*(Runtime|Governance)Decision\w*\s*=\s*\{/g },
  { name: "local lineage interface", re: /interface\s+\w*Lineage\w*/g },
  { name: "route-local sdk envelope type", re: /type\s+\w*(Sdk|SDK)Envelope\w*\s*=\s*\{/g },
  { name: "route-local runtime error envelope", re: /type\s+\w*RuntimeErrorEnvelope\w*\s*=\s*\{/g },
  { name: "route-local governance response contract", re: /interface\s+\w*(Governance|Delegation|Capability|Policy)Response\w*/g },
];
const ALLOWLIST = ["src/lib/aoc/contracts/", "src/lib/aoc/enterprise/authorization.ts", "src/lib/aoc/runtime-client.ts"];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) files.push(full);
  }
  return files;
}

let violations = [];
for (const relDir of SCAN_DIRS) {
  const dir = join(ROOT, relDir);
  for (const file of walk(dir)) {
    const rel = file.replace(`${ROOT}/`, "");
    if (ALLOWLIST.some((x) => rel.startsWith(x))) continue;
    const body = readFileSync(file, 'utf8');
    for (const { name, re } of BLOCK_PATTERNS) {
      if (re.test(body)) violations.push(`${rel}: ${name}`);
    }
  }
}

if (violations.length) {
  console.error("Runtime contract drift detected:\n" + violations.join("\n"));
  process.exit(1);
}

console.log("Runtime contract drift check passed.");
