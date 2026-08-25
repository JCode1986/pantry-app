import Link from "next/link";
import {
  LuClock3,
  LuDatabaseZap,
  LuRefreshCw,
  LuShieldCheck,
} from "react-icons/lu";
import SiteFooter from "@/components/app-shell/SiteFooter";
import WhereKeepLogo from "@/components/ui/WhereKeepLogo";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";

export const metadata = createPageMetadata({
  title: "Maintenance in Progress",
  description:
    "WhereKeep account access is temporarily unavailable while maintenance is in progress.",
  path: "/maintenance",
  robots: NO_INDEX_ROBOTS,
});

const statusItems = [
  {
    icon: LuDatabaseZap,
    title: "Database upgrade in progress",
    description:
      "Account access is paused while the database finishes maintenance.",
  },
  {
    icon: LuShieldCheck,
    title: "Your household data stays protected",
    description:
      "We are not asking you to take any account action during this window.",
  },
  {
    icon: LuClock3,
    title: "Access will return automatically",
    description:
      "Once maintenance is complete, you can sign in and continue where you left off.",
  },
];

export default function MaintenancePage() {
  return (
    <>
      <main className="min-h-[100vh] overflow-hidden bg-gradient-to-br from-white via-[var(--stocksense-brand-soft)]/70 to-sky-50 px-4 py-8 text-gray-900">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col">
          <header className="flex items-center justify-between gap-4 py-2">
            <Link href="/" aria-label="WhereKeep home" className="-ml-5 sm:ml-0">
              <WhereKeepLogo
                className="drop-shadow-sm"
                markClassName="h-16 max-w-[240px] sm:h-20 sm:max-w-[350px]"
              />
            </Link>
            <Link
              href="/support"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-[var(--stocksense-brand-border)] bg-white/90 px-4 text-sm font-semibold text-[var(--stocksense-brand)] shadow-sm transition hover:bg-white"
            >
              Support
            </Link>
          </header>

          <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:py-14">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
                WhereKeep maintenance
              </p>
              <h1 className="text-[2.35rem] font-semibold leading-tight tracking-normal text-[var(--stocksense-brand)] min-[380px]:text-5xl sm:text-6xl">
                Account access is temporarily paused.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-gray-700 sm:text-lg sm:leading-9">
                We are completing maintenance on the database that powers
                WhereKeep. Sign in, signup, and protected household pages may
                be unavailable until the upgrade finishes.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-6 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                >
                  <LuRefreshCw className="h-4 w-4" aria-hidden="true" />
                  Try signing in again
                </Link>
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  Visit homepage
                </Link>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">
                If maintenance continues longer than expected, check back
                shortly or contact support.
              </p>
            </div>

            <div className="min-w-0 rounded-3xl border border-white/80 bg-white/85 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-6">
              <div className="rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-5">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[var(--stocksense-brand)] shadow-sm">
                    <LuDatabaseZap className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--stocksense-brand)]">
                      Status
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
                      Maintenance in progress
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      The application is waiting for the database service to
                      come back online before allowing account access.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {statusItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <article
                      key={item.title}
                      className="flex min-w-0 gap-3 rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-950">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-gray-600">
                          {item.description}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-950">
                  For planned maintenance
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Enable this page during future database upgrades with the
                  production environment variable{" "}
                  <code className="rounded-md bg-white px-1.5 py-0.5 text-xs font-semibold text-gray-800">
                    WHEREKEEP_MAINTENANCE_MODE=1
                  </code>
                  .
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter compact />
    </>
  );
}

