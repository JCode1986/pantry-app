import { siteConfig } from "@/utils/metadata";

export default function sitemap() {
  return [
    {
      url: new URL("/", siteConfig.url).toString(),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/terms", siteConfig.url).toString(),
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: new URL("/privacy", siteConfig.url).toString(),
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
