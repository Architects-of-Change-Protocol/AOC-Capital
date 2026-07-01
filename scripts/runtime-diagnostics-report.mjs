import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const bootstrapSource = readFileSync("src/lib/aoc/bootstrap.ts", "utf8");
const healthSource = readFileSync("src/app/api/health/route.ts", "utf8");

const report = {
  app: packageJson.name,
  packageVersion: packageJson.version,
  generatedAt: new Date().toISOString(),
  readiness: {
    startupAssertions: /ensurePmfreakAocAdaptersRegistered/.test(bootstrapSource) ? "pass" : "fail",
    runtimeComposeOptions: /getEnterpriseRuntimeComposeOptions/.test(bootstrapSource) ? "pass" : "fail",
    healthEndpoint: /export async function GET/.test(healthSource) ? "pass" : "fail",
  },
};

console.log(JSON.stringify(report, null, 2));
if (Object.values(report.readiness).includes("fail")) process.exit(1);
