import WhereKeepLoader from "@/components/ui/WhereKeepLoader";

export default function DashboardLoading() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <WhereKeepLoader
        label="Loading your overview..."
        detail="Updating household totals and recent activity."
      />
    </main>
  );
}
