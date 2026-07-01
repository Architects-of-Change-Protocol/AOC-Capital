import type { LanguageDetectionResult, SupportedLanguage } from "./language-detection";

export type LanguagePreference = {
  preferredLanguage: SupportedLanguage;
  source: "current-input" | "session-history" | "workspace-default" | "fallback";
  shouldMirrorUser: boolean;
};

export function resolveLanguagePreference(input: {
  currentDetection: LanguageDetectionResult;
  previousLanguage?: SupportedLanguage | null;
  workspaceDefault?: SupportedLanguage | null;
}): LanguagePreference {
  const { currentDetection, previousLanguage, workspaceDefault } = input;

  if (currentDetection.confidence === "high") {
    return { preferredLanguage: currentDetection.language, source: "current-input", shouldMirrorUser: true };
  }

  if (currentDetection.mixed && currentDetection.confidence === "medium") {
    return { preferredLanguage: currentDetection.language, source: "current-input", shouldMirrorUser: true };
  }

  if (currentDetection.confidence === "medium") {
    return { preferredLanguage: currentDetection.language, source: "current-input", shouldMirrorUser: true };
  }

  if (previousLanguage) {
    return { preferredLanguage: previousLanguage, source: "session-history", shouldMirrorUser: true };
  }

  if (workspaceDefault) {
    return { preferredLanguage: workspaceDefault, source: "workspace-default", shouldMirrorUser: true };
  }

  return { preferredLanguage: "en", source: "fallback", shouldMirrorUser: true };
}
