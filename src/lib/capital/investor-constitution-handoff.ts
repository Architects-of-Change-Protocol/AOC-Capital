// AOC Capital — Investor Constitution client-side result handoff.
//
// The Investor Constitution intake flow (/capital/constitution/new) does not
// persist to Supabase — the generated constitution lives only in the
// browser. This module is the one place that reads/writes the sessionStorage
// handoff used to carry a just-generated constitution from the intake form
// to the /capital/constitution/result page, so the storage key and shape
// only need to change in one place if a real persistence layer arrives later.

import type { InvestorConstitution } from "@/features/capital/domain/investor-constitution-schema";

export const INVESTOR_CONSTITUTION_HANDOFF_KEY = "aoc:capital:investor-constitution:v1";

export function saveInvestorConstitutionForResult(constitution: InvestorConstitution): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(INVESTOR_CONSTITUTION_HANDOFF_KEY, JSON.stringify(constitution));
  } catch {
    // sessionStorage can be unavailable (private browsing, disabled storage);
    // the result page falls back to its own empty state rather than throwing.
  }
}

export function loadInvestorConstitutionForResult(): InvestorConstitution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(INVESTOR_CONSTITUTION_HANDOFF_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InvestorConstitution;
  } catch {
    return null;
  }
}

export function clearInvestorConstitutionForResult(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(INVESTOR_CONSTITUTION_HANDOFF_KEY);
  } catch {
    // no-op — nothing to clear if storage is unavailable.
  }
}
