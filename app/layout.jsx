import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { getSessionForLayout } from "./actions/auth";
import { Providers } from "@/components/Providers";
import { getPreferenceBootScript } from "@/utils/appPreferences";
import { siteConfig } from "@/utils/metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "inventory tracker",
    "household inventory",
    "pantry app",
    "expiration tracking",
    "storage organization",
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/wherekeep-icon.png",
    apple: "/wherekeep-icon.png",
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
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
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/wherekeep-icon.png"],
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0E7488",
};

export default async function RootLayout({ children }) {
  const session = await getSessionForLayout(); // ✅ read-only
  const token = session?.user?.access_token;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getPreferenceBootScript() }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {token && <Navigation />}
          <div className="bg-gradient-to-br from-stocksense-teal/10 via-stocksense-sky/10 to-stocksense-lime/10">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
