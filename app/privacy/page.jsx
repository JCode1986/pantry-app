import Link from 'next/link';
import SiteFooter from '@/components/app-shell/SiteFooter';
import { createPageMetadata } from '@/utils/metadata';

const updatedAt = 'July 1, 2026';

const sections = [
  {
    title: 'Information We Collect',
    body: [
      'We collect account information such as your email address and authentication details needed to create and secure your account.',
      'We store the inventory information you add, including locations, storage areas, categories, items, quantities, expiration dates, shopping list entries, activity events, photos, barcodes, and household invite details.',
      'We may receive billing status, plan, and subscription information from payment providers. We do not need to store full payment card numbers in WhereKeep.',
    ],
  },
  {
    title: 'How We Use Information',
    body: [
      'We use your information to provide the app, sync inventory, enforce household roles, show recent activity, support barcode-assisted entry, process subscriptions, send account emails, and improve reliability.',
      'We may use aggregated or de-identified information to understand product usage and improve performance, limits, and user experience.',
    ],
  },
  {
    title: 'Photos and Barcode Data',
    body: [
      'Photos you upload are used to display and manage your locations, storage areas, and items. You control what images you choose to upload.',
      'Barcode scans may be used to look up product information from available sources. Lookup results can be incomplete or inaccurate, so you should review item details before saving.',
    ],
  },
  {
    title: 'Sharing and Service Providers',
    body: [
      'We share information with service providers that help operate WhereKeep, such as hosting, authentication, database, storage, email delivery, and payment processing providers.',
      'Household data is visible to members of the household according to their role. Owners should only invite people they want to have access to the household inventory.',
      'We do not sell your personal information.',
    ],
  },
  {
    title: 'Security and Retention',
    body: [
      'We use access controls and security practices intended to protect your account and household data. No internet service can be guaranteed to be perfectly secure.',
      'We keep information while your account or household needs it, while required for billing, security, legal, or operational reasons, or until it is deleted according to available product controls.',
    ],
  },
  {
    title: 'Your Choices',
    body: [
      'You can update or delete many inventory records directly in the app, depending on your household role.',
      'You can manage subscription status through the billing options available to your account. You may also request help with account or data questions through support.',
    ],
  },
  {
    title: 'Children and Viewers',
    body: [
      'WhereKeep is not directed to children. Household owners may choose to invite viewers for read-only access, but owners are responsible for deciding who should have access.',
    ],
  },
  {
    title: 'Updates',
    body: [
      'We may update this policy as WhereKeep changes. The updated date will show when the policy was last revised.',
    ],
  },
];

export const metadata = createPageMetadata({
  title: 'Privacy Policy',
  description: 'How WhereKeep collects, uses, and protects account, inventory, photo, billing, and household access data.',
  path: '/privacy',
});

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">
              This policy explains what WhereKeep collects, how it is used, and
              the choices you have when managing inventory with household members.
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
              <h2 className="text-xl font-semibold text-gray-950">Contact</h2>
              <p className="mt-3 text-sm leading-7 text-gray-700">
                Privacy questions can be sent through the support or contact
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
