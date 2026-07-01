import { NextResponse } from "next/server";
import { ensurePmfreakAocAdaptersRegistered } from "@/lib/aoc/bootstrap";
import {
  retrieveRuntimeHealth,
  evaluateLaunchReadiness,
  classifyDegradedMode,
  generateRuntimeDiagnostics,
  generateRuntimeNarratives,
  evaluateStartupAssertions,
  evaluateRuntimeInvariants,
  evaluateReplayIntegrity,
} from "@/lib/runtime-hardening";

export async function GET() {
  try {
    ensurePmfreakAocAdaptersRegistered();

    const health = retrieveRuntimeHealth();
    const launchReadiness = evaluateLaunchReadiness();
    const degradedMode = classifyDegradedMode();
    const assertions = evaluateStartupAssertions();
    const invariants = evaluateRuntimeInvariants();
    const replayResults = evaluateReplayIntegrity();
    const diagnostics = generateRuntimeDiagnostics(assertions, invariants, degradedMode);
    const narratives = generateRuntimeNarratives(launchReadiness, degradedMode, replayResults);

    return NextResponse.json({
      status: "ok",
      runtimeHealth: health,
      launchReadiness,
      degradedMode,
      diagnostics,
      narratives,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "runtime_hardening_check_failed",
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
