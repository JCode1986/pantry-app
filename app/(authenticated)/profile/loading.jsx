import PageLoadingState from "@/components/ui/PageLoadingState";

export default function ProfileLoading() {
  return (
    <PageLoadingState
      label="Loading profile..."
      detail="Opening household, billing, and preferences."
    />
  );
}
