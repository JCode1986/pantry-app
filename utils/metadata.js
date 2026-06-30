const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const siteConfig = {
  name: "WhereKeep",
  url: appUrl,
  description:
    "Know what you have, where it is, and what needs attention.",
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
          url: "/wherekeep-icon.png",
          width: 512,
          height: 512,
          alt: siteConfig.name,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary",
      title: socialTitle,
      description,
      images: ["/wherekeep-icon.png"],
    },
    robots,
  };
}
