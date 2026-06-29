import Link from "next/link";
import { FaCheck } from "react-icons/fa";
import { BILLING_PLANS } from "@/utils/billingPlans";

export default function PricingSection({ showHeading = true }) {
  return (
    <section className="border-y border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-12">
        {showHeading && (
          <div className="mb-7 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Choose the right StockSense plan.
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Start free, then upgrade when you need unlimited inventory or
              shared household access.
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {BILLING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-xl border bg-white p-5 shadow-sm ${
                plan.featured
                  ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{plan.audience}</p>
                </div>
                {plan.featured && (
                  <span className="rounded-full bg-[var(--stocksense-brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--stocksense-brand)]">
                    Popular
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-600">
                {plan.description}
              </p>

              <div className="mt-5">
                <span className="text-3xl font-semibold text-gray-900">
                  {plan.monthlyPrice}
                </span>
                <span className="text-sm text-gray-500"> /mo</span>
                {plan.yearlyPrice !== "$0" && (
                  <div className="mt-1 text-xs text-gray-500">
                    or {plan.yearlyPrice}/yr
                  </div>
                )}
              </div>

              <ul className="mt-5 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-gray-600">
                    <FaCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--stocksense-brand)]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.id === "free" ? "/login?mode=create" : "/login?mode=create"}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  plan.featured
                    ? "bg-[var(--stocksense-brand)] text-white hover:brightness-95"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {plan.id === "free" ? "Start free" : plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
