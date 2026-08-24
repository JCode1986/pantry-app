import { siteConfig } from "@/utils/metadata";

const privatePaths = [
  "/activity",
  "/api",
  "/areas",
  "/auth/confirm",
  "/categories",
  "/dashboard",
  "/forgot-password",
  "/invite",
  "/items",
  "/locations",
  "/login",
  "/logout",
  "/magic-link-sync",
  "/profile",
  "/reset-password",
  "/signup",
  "/shopping-list",
  "/storage",
  "/storage-areas",
  "/support/chat",
  "/tasks",
];

const publicPaths = [
  "/",
  "/contact",
  "/home-inventory-app",
  "/pantry-inventory-app",
  "/privacy",
  "/shared-household-inventory",
  "/support",
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
