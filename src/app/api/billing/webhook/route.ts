import Stripe from "stripe";
import {
  findCompanyIdByStripeCustomerId,
  getCompanySubscription,
  type SubscriptionPlan,
  type SubscriptionStatus,
  tryRecordProcessedBillingWebhookEvent,
  updateCompanySubscription,
} from "@/lib/billing";
import { getStripeServerClient } from "@/lib/stripe";

const toIsoDate = (timestampSeconds?: number | null) => {
  if (!timestampSeconds) {
    return null;
  }

  return new Date(timestampSeconds * 1000).toISOString();
};

const BILLING_STATUS_BY_STRIPE_STATUS: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  incomplete: "incomplete",
  incomplete_expired: "incomplete_expired",
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "unpaid",
  paused: "paused",
};

const planForSubscription = (subscription: Stripe.Subscription): SubscriptionPlan => {
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const hasProPrice = subscription.items.data.some((item) => item.price.id === proPriceId);

  if (hasProPrice) {
    return "pro";
  }

  const pmoPriceId = process.env.STRIPE_PMO_PRICE_ID;
  const hasPmoPrice = subscription.items.data.some((item) => item.price.id === pmoPriceId);

  if (hasPmoPrice) {
    return "pmo";
  }

  return "free";
};

const companyIdFromSubscription = async (subscription: Stripe.Subscription) => {
  const metadataCompanyId = subscription.metadata.companyId;

  if (metadataCompanyId) {
    return metadataCompanyId;
  }

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  return findCompanyIdByStripeCustomerId(customerId, { useServiceRole: true });
};

const applySubscriptionUpdate = async (subscription: Stripe.Subscription) => {
  const companyId = await companyIdFromSubscription(subscription);

  if (!companyId) {
    console.warn("[billing] subscription update skipped: company not found", { subscriptionId: subscription.id });
    return;
  }

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const periodEnd = subscription.items.data[0]?.current_period_end ?? null;

  const nextPlan = planForSubscription(subscription);
  const nextStatus = BILLING_STATUS_BY_STRIPE_STATUS[subscription.status] ?? "inactive";
  const current = await getCompanySubscription(companyId, { useServiceRole: true });

  const shouldDowngrade = nextStatus === "canceled" || nextStatus === "unpaid" || nextStatus === "incomplete_expired";

  await updateCompanySubscription(companyId, {
    plan: shouldDowngrade ? "free" : nextPlan,
    subscriptionStatus: nextStatus,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: toIsoDate(periodEnd),
  }, { useServiceRole: true });

  console.info("[billing] subscription synced", {
    companyId,
    subscriptionId: subscription.id,
    fromPlan: current.plan,
    toPlan: shouldDowngrade ? "free" : nextPlan,
    fromStatus: current.subscriptionStatus,
    toStatus: nextStatus,
  });
};

const handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
  const companyId = await companyIdFromSubscription(subscription);

  if (!companyId) {
    console.warn("[billing] delete event skipped: company not found", { subscriptionId: subscription.id });
    return;
  }

  const current = await getCompanySubscription(companyId, { useServiceRole: true });

  await updateCompanySubscription(companyId, {
    plan: "free",
    subscriptionStatus: "canceled",
    stripeCustomerId:
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    stripeSubscriptionId: current.stripeSubscriptionId,
    currentPeriodEnd: toIsoDate(subscription.items.data[0]?.current_period_end ?? null),
  }, { useServiceRole: true });
};

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return Response.json({ error: "Missing STRIPE_WEBHOOK_SECRET on server." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.warn("[billing] webhook rejected: missing signature");
    return Response.json({ error: "Missing Stripe signature header." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    const stripe = getStripeServerClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.warn("[billing] webhook rejected: signature verification failed", { error });
    return Response.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  const acceptedEventTypes = new Set([
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ]);

  if (!acceptedEventTypes.has(event.type)) {
    return Response.json({ received: true });
  }

  const shouldProcess = await tryRecordProcessedBillingWebhookEvent(event.id, event.type);

  if (!shouldProcess) {
    console.info("[billing] duplicate webhook ignored", { eventId: event.id, eventType: event.type });
    return Response.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription" || !session.subscription) {
          break;
        }

        const stripe = getStripeServerClient();
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string" ? session.subscription : session.subscription.id,
        );

        await applySubscriptionUpdate(subscription);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await applySubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("[billing] webhook processing failed", { eventId: event.id, eventType: event.type, error });
    return Response.json({ error: "Unable to process webhook." }, { status: 500 });
  }
}
