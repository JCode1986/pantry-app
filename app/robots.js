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
  "/signup",
  "/shopping-list",
];

const publicPaths = [
  "/",
  "/privacy",
  "/terms",
];

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: publicPaths,
      disallow: privatePaths,
    },
    sitemap: new URL("/sitemap.xml", siteConfig.url).toString(),
  };
}
