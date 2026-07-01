// Patterns that are noise — trivial, non-operational greetings
const NOISE_PATTERN = /^(hi|hello|hey|test|yo|sup|howdy|greetings|ping|hola|ok|okay|yep|nope|sure|thanks|thx|ty)\s*[!?.]*$/i;

export function isMeaningfulOperationalContact(prompt: string): boolean {
  const trimmed = prompt.trim();
  // Too short to carry operational signal
  if (trimmed.length < 10) return false;
  // Pure noise phrases
  if (NOISE_PATTERN.test(trimmed)) return false;
  return true;
}
