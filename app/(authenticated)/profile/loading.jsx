import WhereKeepLoader from "@/components/ui/WhereKeepLoader";

export default function ProfileLoading() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <WhereKeepLoader
        label="Loading profile..."
        detail="Opening household, billing, and preferences."
      />
    </main>
  );
}
