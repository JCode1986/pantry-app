import Link from 'next/link';
import SiteFooter from '@/components/app-shell/SiteFooter';
import { createPageMetadata } from '@/utils/metadata';

const updatedAt = 'July 1, 2026';

const sections = [
  {
    title: 'Using WhereKeep',
    body: [
      'WhereKeep helps you organize inventory by location, storage area, category, item, shopping list, photos, barcode-assisted entry, recent activity, and shared household access.',
      'You are responsible for the information you add, including item names, quantities, photos, notes, locations, and invite details. Do not upload content you do not have the right to use.',
    ],
  },
  {
    title: 'Accounts and Household Access',
    body: [
      'You are responsible for keeping your account credentials secure and for activity that happens through your account.',
      'Household owners can invite members and assign roles. Editors may create, update, move, purchase, or delete inventory depending on the features available. Viewers are intended for read-only access.',
      'If a household owner removes a member, that member may lose access to the household data even if they can still sign in to their own account.',
    ],
  },
  {
    title: 'Subscriptions and Billing',
    body: [
      'WhereKeep may offer free and paid plans. Paid subscriptions unlock the limits and features described at checkout or on the pricing page.',
      'Payments, renewals, cancellations, refunds, and taxes may be handled by a payment processor. Your plan remains subject to the billing terms shown when you subscribe.',
      'You can cancel future renewals according to the cancellation options available in your account or through support.',
    ],
  },
  {
    title: 'Acceptable Use',
    body: [
      'Do not misuse WhereKeep, attempt to bypass access controls, interfere with the service, scrape or overload the system, upload malicious content, or use the service for unlawful activity.',
      'We may limit, suspend, or terminate access if an account creates security, legal, operational, or abuse risk.',
    ],
  },
  {
    title: 'Service Changes',
    body: [
      'We may update, add, remove, or limit features over time. We try to avoid disruption, but we cannot guarantee every feature will always be available.',
      'We may also update these terms. If changes are material, we will make reasonable efforts to notify users or present the updated terms in the product.',
    ],
  },
  {
    title: 'Disclaimers and Liability',
    body: [
      'WhereKeep is provided as an inventory organization tool. It is not a safety, medical, legal, tax, insurance, or compliance system.',
      'You are responsible for verifying item condition, expiration, safety, storage requirements, and purchase decisions. To the maximum extent permitted by law, WhereKeep is provided without warranties and our liability is limited to the amount you paid for the service in the prior twelve months.',
    ],
  },
];

export const metadata = createPageMetadata({
  title: 'Terms of Service',
  description: 'Terms for using WhereKeep household inventory tools, subscriptions, and shared access.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <>
      <main className="min-h-[100vh] bg-white">
        <section className="border-b border-gray-200 bg-[var(--stocksense-brand-soft)]">
          <div className="mx-auto max-w-4xl px-5 py-16">
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--stocksense-brand)] hover:brightness-90"
            >
              WhereKeep
            </Link>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">
              These terms explain the rules for using WhereKeep and the responsibilities
              that come with managing household or small-team inventory.
            </p>
            <p className="mt-4 text-sm text-gray-500">Last updated: {updatedAt}</p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-12">
          <div className="space-y-10">
            {sections.map((section) => (
              <article key={section.title}>
                <h2 className="text-xl font-semibold text-gray-950">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-gray-700">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}

            <article className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-xl font-semibold text-gray-950">Questions</h2>
              <p className="mt-3 text-sm leading-7 text-gray-700">
                Questions about these terms can be sent through the support or contact
                channel listed in the app or on WhereKeep communications.
              </p>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
