import WhereKeepLoader from "@/components/ui/WhereKeepLoader";

export default function AreasLoading() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <WhereKeepLoader
        label="Loading storage areas..."
        detail="Organizing areas, categories, and item counts."
      />
    </main>
  );
}
