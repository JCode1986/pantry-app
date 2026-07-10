import Link from "next/link";
import SiteFooter from "@/components/app-shell/SiteFooter";
import { createPageMetadata } from "@/utils/metadata";

const topics = [
  "Product questions",
  "Account help",
  "Billing questions",
  "Feedback and suggestions",
];

export const metadata = createPageMetadata({
  title: "Contact",
  description:
    "Contact WhereKeep for product questions, account help, billing questions, feedback, and suggestions.",
  path: "/contact",
});

export default function ContactPage() {
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
              Contact
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              Get in touch with WhereKeep
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-700">
              Have questions, feedback, or ideas? We would love to hear from you.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-12">
          <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-950">Contact us</h2>
              <div className="mt-5 grid gap-4 text-sm leading-6 text-gray-700">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Email
                  </p>
                  <a
                    href="mailto:support@wherekeep.com"
                    className="mt-1 block break-words text-base font-semibold text-[var(--stocksense-brand)]"
                  >
                    support@wherekeep.com
                  </a>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Response
                  </p>
                  <p className="mt-1 text-gray-700">
                    We typically respond as soon as possible.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Topics
                  </p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {topics.map((topic) => (
                      <li
                        key={topic}
                        className="rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-2 text-sm font-medium text-[var(--stocksense-brand)]"
                      >
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-950">
                Help us improve WhereKeep
              </h2>
              <p className="mt-3 text-sm leading-7 text-gray-700">
                WhereKeep is built around real household organization problems.
                Your feedback helps make the app better for everyone.
              </p>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
