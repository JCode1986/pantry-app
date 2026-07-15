import LandingPage from '@/components/marketing/LandingPage';
import { BILLING_PLANS } from '@/utils/billingPlans';
import { createPageMetadata, siteConfig } from '@/utils/metadata';

export const metadata = createPageMetadata({
  title: 'Household Inventory Tracker',
  description:
    'WhereKeep helps households find what they already own, remember where it lives, use items before they expire, and restock from the same shared system.',
  path: '/',
});

function LandingStructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    inLanguage: "en-US",
    offers: BILLING_PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      category: plan.id,
      price: plan.monthlyPrice.replace("$", ""),
      priceCurrency: "USD",
      description: plan.description,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <LandingStructuredData />
      <LandingPage />
    </>
  );
}
