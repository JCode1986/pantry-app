import Link from "next/link";
import SiteFooter from "@/components/app-shell/SiteFooter";
import { createPageMetadata } from "@/utils/metadata";

const supportCategories = [
  {
    title: "Account help",
    description:
      "Get help managing your profile, login, and account settings.",
  },
  {
    title: "Billing and subscriptions",
    description:
      "Questions about Free, Plus, Family plans, upgrades, or cancellations.",
  },
  {
    title: "Household sharing",
    description:
      "Learn how owners, editors, and viewers work together.",
  },
  {
    title: "Adding and finding items",
    description:
      "Help with locations, storage areas, categories, search, photos, and barcodes.",
  },
  {
    title: "Shopping and restocking",
    description:
      "Questions about shopping lists, quantities, and keeping inventory updated.",
  },
  {
    title: "Report a problem",
    description:
      "Something not working correctly? Let us know so we can fix it.",
  },
];

export const metadata = createPageMetadata({
  title: "Support",
  description:
    "Get WhereKeep support for accounts, billing, household sharing, adding items, search, shopping lists, and problem reports.",
  path: "/support",
});

export default function SupportPage() {
  return (
    <>
      <main className="min-h-[100vh] bg-white">
        <section className="border-b border-gray-200 bg-[var(--stocksense-brand-soft)]">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center">
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--stocksense-brand)] hover:brightness-90"
            >
              WhereKeep
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
              Support
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              How can we help?
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-700">
              Find answers about your account, household sharing, and organizing
              your items.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {supportCategories.map((category) => (
              <article
                key={category.title}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-gray-950">
                  {category.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {category.description}
                </p>
              </article>
            ))}
          </div>

          <article className="mt-6 rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                  Still need help?
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  Send us a message and we will help you out.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--stocksense-brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
              >
                Contact support
              </Link>
            </div>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
