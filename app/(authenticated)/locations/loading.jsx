import PageLoadingState from "@/components/ui/PageLoadingState";

export default function LocationsLoading() {
  return (
    <PageLoadingState
      label="Loading locations..."
      detail="Checking storage spaces and recent items."
    />
  );
}
