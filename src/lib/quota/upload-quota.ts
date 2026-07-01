import type { SubscriptionPlan } from "@/lib/billing";
import { getUploadLimit } from "@/lib/feature-gates";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// ── Types ─────────────────────────────────────────────────────────────────────

export type QuotaReservationAllowed = {
  allowed: true;
  reservationId: string;
  previousUsage: number;
  newUsage: number;
  limit: number | null;
  resetPeriod: string;
  reason: "quota_approved" | "idempotent_replay";
};

export type QuotaReservationRejected = {
  allowed: false;
  reservationId: null;
  previousUsage: number;
  newUsage: number;
  limit: number | null;
  resetPeriod: string;
  reason: "quota_exceeded";
};

export type QuotaReservationResult = QuotaReservationAllowed | QuotaReservationRejected;

type RpcReserveResult = {
  allowed: boolean;
  reason: string;
  reservation_id: string | null;
  previous_usage: number;
  new_usage: number;
  limit: number | null;
  reset_period: string;
};

type RpcCommitResult = {
  committed: boolean;
  reason: string;
  new_usage?: number;
  amount?: number;
};

type RpcCancelResult = {
  cancelled: boolean;
  reason: string;
  amount?: number;
};

// ── Internal helpers ──────────────────────────────────────────────────────────

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Atomically checks quota and creates a pending reservation via PostgreSQL RPC.
 *
 * The effective usage seen by the RPC is: committed upload_count + sum of all
 * non-expired pending reservations for the same company/month. This prevents
 * concurrent requests from both passing the quota check before either commits.
 *
 * On approval, the returned reservationId MUST be passed to either
 * commitUploadQuota (on success) or cancelUploadQuota (on any failure/rollback).
 */
export const reserveUploadQuota = async (params: {
  companyId: string;
  uploadAmount: number;
  plan: SubscriptionPlan;
  requestId: string;
}): Promise<QuotaReservationResult> => {
  const { companyId, uploadAmount, plan, requestId } = params;
  const monthKey = getCurrentMonthKey();
  const limit = getUploadLimit(plan);

  console.info("[quota] quota_reservation_started", {
    requestId,
    companyId,
    uploadAmount,
    limit,
    monthKey,
  });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("reserve_upload_quota", {
    p_company_id: companyId,
    p_upload_amount: uploadAmount,
    p_upload_limit: limit,
    p_month_key: monthKey,
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(`Quota reservation failed: ${error.message}`);
  }

  const result = data as RpcReserveResult;

  if (!result.allowed) {
    console.warn("[quota] quota_reservation_rejected", {
      requestId,
      companyId,
      uploadAmount,
      currentUsage: result.previous_usage,
      resultingUsage: result.new_usage,
      limit: result.limit,
    });
    return {
      allowed: false,
      reservationId: null,
      previousUsage: result.previous_usage,
      newUsage: result.new_usage,
      limit: result.limit,
      resetPeriod: result.reset_period,
      reason: "quota_exceeded",
    };
  }

  console.info("[quota] quota_reservation_succeeded", {
    requestId,
    companyId,
    uploadAmount,
    reservationId: result.reservation_id,
    currentUsage: result.previous_usage,
    resultingUsage: result.new_usage,
    limit: result.limit,
  });

  return {
    allowed: true,
    reservationId: result.reservation_id!,
    previousUsage: result.previous_usage,
    newUsage: result.new_usage,
    limit: result.limit,
    resetPeriod: result.reset_period,
    reason: result.reason as "quota_approved" | "idempotent_replay",
  };
};

/**
 * Atomically promotes a pending reservation to committed usage.
 *
 * Increments company_usage.upload_count by the reserved amount and deletes the
 * reservation record. Must be called only after all storage uploads in the batch
 * have succeeded. Throws on any failure — the caller should treat this as fatal.
 */
export const commitUploadQuota = async (params: {
  reservationId: string;
  companyId: string;
  requestId: string;
  uploadAmount: number;
}): Promise<void> => {
  const { reservationId, companyId, requestId, uploadAmount } = params;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("commit_upload_quota", {
    p_reservation_id: reservationId,
    p_company_id: companyId,
  });

  if (error) {
    console.error("[quota] quota_commit_failed", {
      requestId,
      companyId,
      uploadAmount,
      reservationId,
      error: error.message,
    });
    throw new Error(`Quota commit failed: ${error.message}`);
  }

  const result = data as RpcCommitResult;

  if (!result.committed) {
    console.error("[quota] quota_commit_failed", {
      requestId,
      companyId,
      uploadAmount,
      reservationId,
      reason: result.reason,
    });
    throw new Error(`Quota commit rejected: ${result.reason}`);
  }

  console.info("[quota] quota_commit_completed", {
    requestId,
    companyId,
    uploadAmount,
    reservationId,
    resultingUsage: result.new_usage,
  });
};

/**
 * Cancels a pending reservation on the rollback path.
 *
 * Deletes the reservation without touching company_usage.upload_count — the
 * count was never modified during reserve, so no compensating decrement is needed.
 * Best-effort: logs errors but does not throw, to avoid masking the original failure.
 */
export const cancelUploadQuota = async (params: {
  reservationId: string;
  companyId: string;
  requestId: string;
  uploadAmount: number;
}): Promise<void> => {
  const { reservationId, companyId, requestId, uploadAmount } = params;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("cancel_upload_quota", {
    p_reservation_id: reservationId,
    p_company_id: companyId,
  });

  if (error) {
    console.error("[quota] quota_reservation_rolled_back_failed", {
      requestId,
      companyId,
      uploadAmount,
      reservationId,
      error: error.message,
    });
    return;
  }

  const result = data as RpcCancelResult;
  console.info("[quota] quota_reservation_rolled_back", {
    requestId,
    companyId,
    uploadAmount,
    reservationId,
    cancelled: result.cancelled,
    reason: result.reason,
  });
};
