import WhereKeepLoader from "@/components/ui/WhereKeepLoader";

export default function LocationsLoading() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <WhereKeepLoader
        label="Loading locations..."
        detail="Checking storage spaces and recent items."
      />
    </main>
  );
}
