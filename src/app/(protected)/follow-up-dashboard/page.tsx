import { FollowUpDashboardClient } from "@/features/follow-up/follow-up-dashboard-client";

export default async function FollowUpDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const params = await searchParams;
  return <FollowUpDashboardClient projectId={params.projectId} />;
}
