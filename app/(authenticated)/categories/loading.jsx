import PageLoadingState from "@/components/ui/PageLoadingState";

export default function CategoriesLoading() {
  return (
    <PageLoadingState
      label="Loading categories..."
      detail="Grouping items across your storage areas."
    />
  );
}
