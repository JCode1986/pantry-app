import WhereKeepLoader from "@/components/ui/WhereKeepLoader";

const authenticatedShellClasses =
  "wherekeep-page-loading flex min-h-[calc(100svh-61px-6rem)] w-full items-center justify-center px-4 py-8 sm:py-10 lg:min-h-[calc(100svh-var(--wherekeep-desktop-commandbar-height))] lg:px-6 lg:py-12";

export default function PageLoadingState({
  label,
  detail,
  isAuthenticated = true,
}) {
  const content = <WhereKeepLoader label={label} detail={detail} />;

  if (!isAuthenticated) {
    return (
      <main className="wherekeep-page-loading flex min-h-screen w-full items-center justify-center px-4 py-8">
        {content}
      </main>
    );
  }

  return <main className={authenticatedShellClasses}>{content}</main>;
}
