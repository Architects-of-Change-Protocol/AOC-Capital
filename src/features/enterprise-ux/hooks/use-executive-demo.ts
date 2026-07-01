"use client";

import { useMemo } from "react";
import { buildExecutiveDemoScenario } from "../demo-runtime/executive-demo-runtime";
import type {
  DemoAudience,
  DemoScenarioCategory,
  ExecutiveDemoScenario,
} from "../types/enterprise-ux-types";

export function useExecutiveDemo(
  audience: DemoAudience = "executive",
  category: DemoScenarioCategory = "delivery_pressure"
): ExecutiveDemoScenario | null {
  return useMemo(
    () => buildExecutiveDemoScenario(audience, category),
    [audience, category]
  );
}
