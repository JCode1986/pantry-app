import LandingPage from '@/components/marketing/LandingPage';
import { BILLING_PLANS } from '@/utils/billingPlans';
import { createPageMetadata, siteConfig } from '@/utils/metadata';

export const metadata = createPageMetadata({
  title: 'Home Inventory App for Organized Households | WhereKeep',
  description:
    'WhereKeep is a home inventory app for tracking what you own, where it is stored, what is expiring, what to restock, and which household tasks need attention.',
  path: '/',
  twitterCard: 'summary_large_image',
});

function LandingStructuredData() {
  const logoUrl = new URL('/wherekeep-app-icon.png', siteConfig.url).toString();
  const imageUrl = new URL('/wherekeep-social-preview.jpg', siteConfig.url).toString();
  const appDescription =
    'WhereKeep is a home inventory app for tracking what you own, where it is stored, what is expiring, what to restock, and which household tasks need attention.';

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: {
          "@type": "ImageObject",
          url: logoUrl,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        name: siteConfig.name,
        url: siteConfig.url,
        publisher: {
          "@id": `${siteConfig.url}/#organization`,
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${siteConfig.url}/#webapplication`,
        name: siteConfig.name,
        url: siteConfig.url,
        image: imageUrl,
        description: appDescription,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        inLanguage: "en-US",
        publisher: {
          "@id": `${siteConfig.url}/#organization`,
        },
        featureList: [
          "Household inventory tracking",
          "Locations and storage areas",
          "Quantity tracking",
          "Expiration tracking",
          "Shared household access",
          "Shopping lists",
          "Tasks and chores",
          "Recurring chores",
          "Household member assignments",
        ],
        offers: BILLING_PLANS.map((plan) => ({
          "@type": "Offer",
          name: plan.name,
          category: plan.id,
          price: plan.monthlyPrice.replace("$", ""),
          priceCurrency: "USD",
          description: plan.description,
        })),
      },
    ],
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
