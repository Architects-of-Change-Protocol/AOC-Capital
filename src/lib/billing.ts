import { createPrivilegedSupabaseClient } from "@/lib/security/privileged-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SubscriptionPlan = "free" | "pro" | "pmo";

export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type CompanySubscriptionState = {
  plan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
};

const DEFAULT_STATE: CompanySubscriptionState = {
  plan: "free",
  subscriptionStatus: "inactive",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  currentPeriodEnd: null,
};

const toPlan = (plan: unknown): SubscriptionPlan => {
  if (plan === "free" || plan === "pro" || plan === "pmo") {
    return plan;
  }

  return DEFAULT_STATE.plan;
};

const toStatus = (status: unknown): SubscriptionStatus => {
  if (
    status === "inactive" ||
    status === "trialing" ||
    status === "active" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "incomplete" ||
    status === "incomplete_expired" ||
    status === "unpaid" ||
    status === "paused"
  ) {
    return status;
  }

  return DEFAULT_STATE.subscriptionStatus;
};

const normalizeState = (row: {
  plan: unknown;
  subscription_status: unknown;
  stripe_customer_id: unknown;
  stripe_subscription_id: unknown;
  current_period_end: unknown;
}): CompanySubscriptionState => ({
  plan: toPlan(row.plan),
  subscriptionStatus: toStatus(row.subscription_status),
  stripeCustomerId: typeof row.stripe_customer_id === "string" && row.stripe_customer_id.length > 0 ? row.stripe_customer_id : null,
  stripeSubscriptionId:
    typeof row.stripe_subscription_id === "string" && row.stripe_subscription_id.length > 0
      ? row.stripe_subscription_id
      : null,
  currentPeriodEnd: typeof row.current_period_end === "string" && row.current_period_end.length > 0 ? row.current_period_end : null,
});

const getClient = async (useServiceRole: boolean, context?: { routeId: string; operation: string; reason: string; actorUserId?: string; workspaceId?: string; systemActor?: "stripe_webhook" | "background_job" | "system" }) => {
  if (useServiceRole) {
    if (!context) throw new Error("Privileged billing access requires explicit context.");
    return createPrivilegedSupabaseClient(context);
  }

  return createSupabaseServerClient();
};

export const getCompanySubscription = async (
  companyId: string,
  options?: { useServiceRole?: boolean; privilegedContext?: { routeId: string; operation: string; reason: string; actorUserId?: string; workspaceId?: string; systemActor?: "stripe_webhook" | "background_job" | "system" } },
): Promise<CompanySubscriptionState> => {
  const supabase = await getClient(Boolean(options?.useServiceRole), options?.privilegedContext);

  const { data, error } = await supabase
    .from("company_subscriptions")
    .select("plan, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to read company subscription: ${error.message}`);
  }

  if (!data) {
    return DEFAULT_STATE;
  }

  return normalizeState(data);
};

export const setCompanySubscription = async (
  companyId: string,
  value: CompanySubscriptionState,
  options?: { useServiceRole?: boolean; privilegedContext?: { routeId: string; operation: string; reason: string; actorUserId?: string; workspaceId?: string; systemActor?: "stripe_webhook" | "background_job" | "system" } },
): Promise<CompanySubscriptionState> => {
  const supabase = await getClient(Boolean(options?.useServiceRole), options?.privilegedContext);

  const { data, error } = await supabase
    .from("company_subscriptions")
    .upsert(
      {
        company_id: companyId,
        plan: value.plan,
        subscription_status: value.subscriptionStatus,
        stripe_customer_id: value.stripeCustomerId,
        stripe_subscription_id: value.stripeSubscriptionId,
        current_period_end: value.currentPeriodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" },
    )
    .select("plan, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end")
    .single();

  if (error) {
    throw new Error(`Unable to persist company subscription: ${error.message}`);
  }

  return normalizeState(data);
};

export const updateCompanySubscription = async (
  companyId: string,
  patch: Partial<CompanySubscriptionState>,
  options?: { useServiceRole?: boolean; privilegedContext?: { routeId: string; operation: string; reason: string; actorUserId?: string; workspaceId?: string; systemActor?: "stripe_webhook" | "background_job" | "system" } },
): Promise<CompanySubscriptionState> => {
  const current = await getCompanySubscription(companyId, options);
  return setCompanySubscription(companyId, { ...current, ...patch }, options);
};

export const findCompanyIdByStripeCustomerId = async (
  customerId: string,
  options?: { useServiceRole?: boolean; privilegedContext?: { routeId: string; operation: string; reason: string; actorUserId?: string; workspaceId?: string; systemActor?: "stripe_webhook" | "background_job" | "system" } },
): Promise<string | null> => {
  const supabase = await getClient(Boolean(options?.useServiceRole), options?.privilegedContext);

  const { data, error } = await supabase
    .from("company_subscriptions")
    .select("company_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to look up company by Stripe customer ID: ${error.message}`);
  }

  return data?.company_id ?? null;
};

export const tryRecordProcessedBillingWebhookEvent = async (
  eventId: string,
  eventType: string,
): Promise<boolean> => {
  // PRIVILEGED_ACCESS: Stripe webhooks arrive without a user session; the idempotency guard write to billing_webhook_events must not be blocked by user RLS.
  // AUDIT_REF: service-role-risk-register.md
  const supabase = createPrivilegedSupabaseClient({ routeId: "/api/billing/webhook", operation: "record_processed_billing_webhook", reason: "idempotency_guard", systemActor: "stripe_webhook" });

  const { error } = await supabase
    .from("billing_webhook_events")
    .insert({ event_id: eventId, event_type: eventType, processed_at: new Date().toISOString() });

  if (!error) {
    return true;
  }

  if (error.code === "23505") {
    return false;
  }

  throw new Error(`Unable to record processed billing webhook event: ${error.message}`);
};
