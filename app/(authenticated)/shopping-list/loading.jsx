import PageLoadingState from "@/components/ui/PageLoadingState";

export default function ShoppingListLoading() {
  return (
    <PageLoadingState
      label="Loading shopping list..."
      detail="Checking what needs restocking."
    />
  );
}
