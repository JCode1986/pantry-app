"use client";

import Link from "next/link";
import WhereKeepLogo from "@/components/ui/WhereKeepLogo";

const primaryLinks = [
  { href: "/", label: "Product" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/login", label: "Log in" },
  { href: "/signup", label: "Create account" },
];

const legalLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export default function SiteFooter({ compact = false, className = "" }) {
  return (
    <footer
      className={`border-t border-[var(--stocksense-brand-border)] bg-white ${className}`}
    >
      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" aria-label="WhereKeep home">
              <WhereKeepLogo markClassName="h-10 max-w-[170px]" />
            </Link>
            {!compact && (
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Keep track of what you own, where it lives, what needs attention,
                and who can help manage it.
              </p>
            )}
          </div>

          <nav
            aria-label="Footer navigation"
            className="grid gap-6 text-sm sm:grid-cols-2"
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
                WhereKeep
              </div>
              <div className="mt-3 grid gap-2">
                {primaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-gray-600 transition hover:text-[var(--stocksense-brand)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
                Legal
              </div>
              <div className="mt-3 grid gap-2">
                {legalLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-gray-600 transition hover:text-[var(--stocksense-brand)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>

        <div className="mt-7 flex flex-col gap-2 border-t border-gray-100 pt-5 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>(c) 2026 WhereKeep. All rights reserved.</p>
          <p className="rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 py-1 text-[var(--stocksense-brand)]">
            Built for households, shelves, stores, schools, and teams.
          </p>
        </div>
      </div>
    </footer>
  );
}
