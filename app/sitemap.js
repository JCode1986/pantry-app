import { siteConfig } from "@/utils/metadata";

export default function sitemap() {
  return [
    {
      url: new URL("/", siteConfig.url).toString(),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
