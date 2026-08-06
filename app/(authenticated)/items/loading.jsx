import WhereKeepLoader from "@/components/ui/WhereKeepLoader";

export default function ItemsLoading() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <WhereKeepLoader
        label="Loading items..."
        detail="Restoring your inventory list and filters."
      />
    </main>
  );
}
