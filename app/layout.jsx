import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { getSessionForLayout } from "./actions/auth";
import { Providers } from "@/components/Providers";

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
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({ children }) {
  const session = await getSessionForLayout(); // ✅ read-only
  const token = session?.user?.access_token;
  // const expiresAt = session?.user?.expires_at;
  // const now = Math.floor(Date.now() / 1000);

  // treat token as valid only if not expired
  // const hasValidToken = !!token && (!expiresAt || expiresAt > now);

  return (
    <html lang="en">
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
