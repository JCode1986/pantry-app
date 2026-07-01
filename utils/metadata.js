const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const siteConfig = {
  name: "WhereKeep",
  url: appUrl,
  description:
    "Know what you have, where it is, and what needs attention.",
};

export const NO_INDEX_ROBOTS = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};

export function createPageMetadata({
  title,
  description = siteConfig.description,
  path = "/",
  robots,
} = {}) {
  const pageTitle = title || siteConfig.name;
  const socialTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name;
  const url = new URL(path, siteConfig.url);

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: url.pathname,
    },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: siteConfig.name,
      images: [
        {
          url: "/wherekeep-social-preview.jpg",
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} household inventory preview`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary",
      title: socialTitle,
      description,
      images: ["/wherekeep-social-preview.jpg"],
    },
    robots,
  };
}
