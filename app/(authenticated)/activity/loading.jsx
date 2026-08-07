import PageLoadingState from "@/components/ui/PageLoadingState";

export default function ActivityLoading() {
  return (
    <PageLoadingState
      label="Loading activity..."
      detail="Finding the latest household changes."
    />
  );
}
