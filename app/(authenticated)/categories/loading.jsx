import WhereKeepLoader from "@/components/ui/WhereKeepLoader";

export default function CategoriesLoading() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <WhereKeepLoader
        label="Loading categories..."
        detail="Grouping items across your storage areas."
      />
    </main>
  );
}
