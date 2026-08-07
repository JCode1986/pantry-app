import PageLoadingState from "@/components/ui/PageLoadingState";

export default function ItemsLoading() {
  return (
    <PageLoadingState
      label="Loading items..."
      detail="Restoring your inventory list and filters."
    />
  );
}
