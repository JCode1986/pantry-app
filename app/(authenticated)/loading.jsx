import WhereKeepLoader from "@/components/ui/WhereKeepLoader";

export default function AuthenticatedLoading() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <WhereKeepLoader />
    </main>
  );
}
