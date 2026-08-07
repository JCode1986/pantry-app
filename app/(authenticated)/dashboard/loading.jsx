import PageLoadingState from "@/components/ui/PageLoadingState";

export default function DashboardLoading() {
  return (
    <PageLoadingState
      label="Loading your overview..."
      detail="Updating household totals and recent activity."
    />
  );
}
