import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { getSessionForLayout } from "./actions/auth";
import { Providers } from "@/components/Providers";
import { getPreferenceBootScript } from "@/utils/appPreferences";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "StockSense",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
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
