import { siteConfig } from "@/utils/metadata";

export default function sitemap() {
  return [
    {
      url: new URL("/", siteConfig.url).toString(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/contact", siteConfig.url).toString(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: new URL("/support", siteConfig.url).toString(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: new URL("/home-inventory-app", siteConfig.url).toString(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: new URL("/terms", siteConfig.url).toString(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: new URL("/privacy", siteConfig.url).toString(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
