export function shouldPreserveToken(token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) return false;

  if (/^[A-Z]{2,8}$/.test(trimmed)) return true;
  if (/^[A-Za-z]+[-_]?\d+[A-Za-z\d-]*$/.test(trimmed) || /^[A-Za-z\d]+-[A-Za-z\d-]+$/.test(trimmed)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true;
  if (/^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w./-]*)?$/.test(trimmed)) return true;

  return false;
}
