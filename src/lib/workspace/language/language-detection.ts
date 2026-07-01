export type SupportedLanguage = "en" | "es";
export type LanguageConfidence = "low" | "medium" | "high";

export type LanguageDetectionResult = {
  language: SupportedLanguage;
  confidence: LanguageConfidence;
  mixed: boolean;
  evidence: string[];
};

const SPANISH_MARKERS = ["cliente", "proveedor", "aprobación", "atraso", "alcance", "riesgo", "reunión", "minuta", "escalamiento", "pendiente", "bloqueo", "dependencia"];
const ENGLISH_MARKERS = ["client", "vendor", "approval", "delay", "scope", "risk", "meeting", "minutes", "escalation", "pending", "blockage", "dependency"];

export function detectOperationalLanguage(input: string): LanguageDetectionResult {
  const normalized = input.toLowerCase();
  const spanishMatches = SPANISH_MARKERS.filter((marker) => normalized.includes(marker));
  const englishMatches = ENGLISH_MARKERS.filter((marker) => normalized.includes(marker));
  const mixed = spanishMatches.length > 0 && englishMatches.length > 0;

  if (mixed) {
    return {
      language: spanishMatches.length >= englishMatches.length ? "es" : "en",
      confidence: spanishMatches.length + englishMatches.length >= 3 ? "high" : "medium",
      mixed: true,
      evidence: [...spanishMatches.map((m) => `es:${m}`), ...englishMatches.map((m) => `en:${m}`)],
    };
  }

  if (spanishMatches.length > 0) {
    return {
      language: "es",
      confidence: spanishMatches.length >= 2 ? "high" : "medium",
      mixed: false,
      evidence: spanishMatches.map((m) => `es:${m}`),
    };
  }

  if (englishMatches.length > 0) {
    return {
      language: "en",
      confidence: englishMatches.length >= 2 ? "high" : "medium",
      mixed: false,
      evidence: englishMatches.map((m) => `en:${m}`),
    };
  }

  return { language: "en", confidence: "low", mixed: false, evidence: ["fallback:unknown-language"] };
}
