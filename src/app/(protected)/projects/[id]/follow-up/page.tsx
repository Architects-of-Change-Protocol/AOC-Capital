import { FollowUpDashboardClient } from "@/features/follow-up/follow-up-dashboard-client";

export default async function ProjectFollowUpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FollowUpDashboardClient projectId={id} />;
}
