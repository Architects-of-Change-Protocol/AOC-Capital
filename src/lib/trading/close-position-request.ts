// Validates the client-supplied part of a close-position request. The close
// price and realized P&L are always calculated server-side (see
// closePaperPosition in trade-service.ts) — the only thing a client may
// influence is close_reason, and only from this fixed enum.

import { CLOSE_REASONS, type CloseReason } from "./database-contract";

export type ParsedClosePositionRequest = { closeReason: CloseReason };

export type ParseClosePositionRequestResult = { ok: true; request: ParsedClosePositionRequest } | { ok: false; error: string };

const DEFAULT_CLOSE_REASON: CloseReason = "user_requested";

export function parseClosePositionRequest(body: unknown): ParseClosePositionRequestResult {
  if (body === null || body === undefined) {
    return { ok: true, request: { closeReason: DEFAULT_CLOSE_REASON } };
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const closeReason = (body as { closeReason?: unknown }).closeReason;
  if (closeReason === undefined) {
    return { ok: true, request: { closeReason: DEFAULT_CLOSE_REASON } };
  }
  if (typeof closeReason !== "string" || !CLOSE_REASONS.includes(closeReason as CloseReason)) {
    return { ok: false, error: `closeReason must be one of: ${CLOSE_REASONS.join(", ")}.` };
  }
  return { ok: true, request: { closeReason: closeReason as CloseReason } };
}
