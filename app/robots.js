import { siteConfig } from "@/utils/metadata";

const privatePaths = [
  "/areas",
  "/categories",
  "/forgot-password",
  "/invite",
  "/items",
  "/locations",
  "/login",
  "/magic-link-sync",
  "/profile",
  "/reset-password",
  "/shopping-list",
  "/storage-areas",
];

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privatePaths,
    },
    sitemap: new URL("/sitemap.xml", siteConfig.url).toString(),
  };
}
