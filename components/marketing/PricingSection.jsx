import Link from "next/link";
import { FaCheck } from "react-icons/fa";
import { BILLING_PLANS } from "@/utils/billingPlans";

function getPlanCta(plan) {
  if (plan.id === "free") return "Start free";
  if (plan.id === "plus") return "Unlock unlimited";
  return "Invite your household";
}

function getPlanBadge(plan) {
  if (plan.id === "free") return "Try it";
  if (plan.id === "plus") return "Most popular";
  return "Shared access";
}

export default function PricingSection({ showHeading = true }) {
  return (
    <section id="pricing" className="border-y border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-5 py-12">
        {showHeading && (
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
              Pricing
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Pricing that follows the moment of value.
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
              Free is enough to organize the first shelf. Plus is for serious
              household tracking, and Family is for controlled shared access.
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {BILLING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm ${
                plan.featured
                  ? "border-[var(--stocksense-brand-border)] ring-2 ring-[var(--stocksense-brand-border)]"
                  : "border-gray-200"
              }`}
            >
              {plan.featured && (
                <div className="absolute inset-x-0 top-0 h-1 bg-[var(--stocksense-brand)]" />
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{plan.audience}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    plan.featured
                      ? "bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {getPlanBadge(plan)}
                </span>
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
                    or {plan.yearlyPrice}/yr for a lower annual cost
                  </div>
                )}
              </div>

              <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Includes
              </div>
              <ul className="mt-2 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-gray-600">
                    <FaCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--stocksense-brand)]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  plan.featured
                    ? "bg-[var(--stocksense-brand)] text-white hover:brightness-95"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {getPlanCta(plan)}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
