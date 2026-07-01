import type { SubscriptionPlan } from "@/lib/billing";
import { canAccessFeature } from "@/lib/feature-gates";

export const canRunAiAnalysis = (plan: SubscriptionPlan) => canAccessFeature(plan, "ai_analysis");
export const canExportReports = (plan: SubscriptionPlan) => canAccessFeature(plan, "exports");
export const canInviteTeamMembers = (plan: SubscriptionPlan) => canAccessFeature(plan, "pmo_team_members");
export const canUsePortfolioMemory = (plan: SubscriptionPlan) => canAccessFeature(plan, "organizational_memory");
