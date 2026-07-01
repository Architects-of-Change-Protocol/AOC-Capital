const FLAG_KEY = "pmfreak.beta.ENABLE_RUNTIME_VALIDATION";

export function isRuntimeValidationEnabled(): boolean {
  if (typeof window === "undefined") {
    return process.env["ENABLE_RUNTIME_VALIDATION"] === "true";
  }
  try {
    const localOverride = window.localStorage.getItem(FLAG_KEY);
    if (localOverride !== null) return localOverride === "true";
  } catch {
    // localStorage unavailable
  }
  return process.env["NEXT_PUBLIC_ENABLE_RUNTIME_VALIDATION"] === "true";
}

export function setRuntimeValidationEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FLAG_KEY, enabled ? "true" : "false");
  } catch {
    // localStorage unavailable
  }
}
