import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/app-shell/Navigation";
import { getSessionForLayout } from "./actions/auth";
import { Providers } from "@/components/app-shell/Providers";
import { getPreferenceBootScript } from "@/utils/appPreferences";
import { siteConfig } from "@/utils/metadata";
import {
  canEditHouseholdInventory,
  getHouseholdBilling,
  getHouseholdForUser,
  normalizeHouseholdRole,
} from "@/utils/households";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

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
    icon: "/wherekeep-app-icon.png",
    apple: "/wherekeep-app-icon.png",
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: "/wherekeep-social-preview.jpg",
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} household inventory preview`,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/wherekeep-social-preview.jpg"],
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

function addDays(date, days) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getNavigationAttentionCounts(supabase, withinDays = 3) {
  const today = toDateString(new Date());
  const cutoff = toDateString(addDays(new Date(), withinDays));

  const [
    { count: expiredCount = 0, error: expiredError },
    { count: expiringSoonCount = 0, error: expiringSoonError },
    { count: shoppingListNeededItems = 0, error: shoppingListError },
    { count: locationsCount = 0, error: locationsError },
    { count: storageAreasCount = 0, error: storageAreasError },
    { count: categoriesCount = 0, error: categoriesError },
    { count: itemsCount = 0, error: itemsError },
  ] = await Promise.all([
    supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .not("expiration_date", "is", null)
      .lt("expiration_date", today),
    supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .not("expiration_date", "is", null)
      .gte("expiration_date", today)
      .lte("expiration_date", cutoff),
    supabase
      .from("shopping_list_items")
      .select("*", { count: "exact", head: true })
      .eq("status", "needed"),
    supabase.from("locations").select("*", { count: "exact", head: true }),
    supabase.from("storage_areas").select("*", { count: "exact", head: true }),
    supabase.from("storage_categories").select("*", { count: "exact", head: true }),
    supabase.from("items").select("*", { count: "exact", head: true }),
  ]);

  if (
    expiredError ||
    expiringSoonError ||
    shoppingListError ||
    locationsError ||
    storageAreasError ||
    categoriesError ||
    itemsError
  ) {
    console.error("Navigation attention count error:", {
      expiredError,
      expiringSoonError,
      shoppingListError,
      locationsError,
      storageAreasError,
      categoriesError,
      itemsError,
    });
    return {
      expiredCount: 0,
      expiringSoonCount: 0,
      shoppingListNeededItems: 0,
      locationsCount: 0,
      storageAreasCount: 0,
      categoriesCount: 0,
      itemsCount: 0,
    };
  }

  return {
    expiredCount: expiredCount ?? 0,
    expiringSoonCount: expiringSoonCount ?? 0,
    shoppingListNeededItems: shoppingListNeededItems ?? 0,
    locationsCount: locationsCount ?? 0,
    storageAreasCount: storageAreasCount ?? 0,
    categoriesCount: categoriesCount ?? 0,
    itemsCount: itemsCount ?? 0,
  };
}

async function getNavigationHouseholdCounts(householdId) {
  if (!householdId) {
    return {
      memberCount: 0,
      inviteCount: 0,
    };
  }

  const admin = createAdminClient();
  const [
    { count: memberCount = 0, error: membersError },
    { count: inviteCount = 0, error: invitesError },
  ] = await Promise.all([
    admin
      .from("household_members")
      .select("*", { count: "exact", head: true })
      .eq("household_id", householdId),
    admin
      .from("household_invites")
      .select("*", { count: "exact", head: true })
      .eq("household_id", householdId)
      .eq("status", "pending"),
  ]);

  if (membersError || invitesError) {
    console.error("Navigation household count error:", {
      membersError,
      invitesError,
    });
    return {
      memberCount: 0,
      inviteCount: 0,
    };
  }

  return {
    memberCount: memberCount ?? 0,
    inviteCount: inviteCount ?? 0,
  };
}

function getPreferredName(user) {
  const metadata = user?.user_metadata ?? {};
  const name =
    metadata.preferred_name ||
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    "";

  return name ? String(name).trim() : "";
}

export default async function RootLayout({ children }) {
  const session = await getSessionForLayout(); // ✅ read-only
  let currentUser = session?.user?.user ?? null;
  let canEditInventory = true;
  let attentionCounts = {
    expiredCount: 0,
    expiringSoonCount: 0,
    shoppingListNeededItems: 0,
    locationsCount: 0,
    storageAreasCount: 0,
    categoriesCount: 0,
    itemsCount: 0,
    memberCount: 0,
    inviteCount: 0,
  };
  let navigationSummary = {
    householdName: "",
    householdRole: "",
    isFamilyPlan: false,
    displayName: "",
  };
  let supabase = null;

  if (!currentUser?.id) {
    try {
      supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      currentUser = user ?? null;
    } catch (err) {
      console.error("Navigation Supabase user error:", err);
    }
  }

  if (currentUser?.id) {
    try {
      if (!supabase) supabase = await createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!userError && user?.id === currentUser.id) {
        currentUser = user;
      }
    } catch (err) {
      console.error("Navigation Supabase display name error:", err);
    }
  }

  if (currentUser?.id) {
    try {
      const { household, member } = await getHouseholdForUser({
        userId: currentUser.id,
        email: currentUser.email,
        createIfMissing: true,
      });
      const billing = await getHouseholdBilling(household);
      canEditInventory = canEditHouseholdInventory(member);
      navigationSummary = {
        householdName: household?.name || "",
        householdRole: normalizeHouseholdRole(member?.role),
        isFamilyPlan: billing.effectivePlanId === "family",
        displayName: getPreferredName(currentUser),
      };
      attentionCounts = {
        ...attentionCounts,
        ...(await getNavigationHouseholdCounts(household?.id)),
      };
    } catch (err) {
      console.error("Navigation household role error:", err);
    }

    try {
      if (!supabase) supabase = await createClient();
      attentionCounts = {
        ...attentionCounts,
        ...(await getNavigationAttentionCounts(supabase)),
      };
    } catch (err) {
      console.error("Navigation attention count error:", err);
    }
  }

  const pageContent = (
    <>
      {currentUser?.id && (
        <Navigation
          canEditInventory={canEditInventory}
          attentionCounts={attentionCounts}
          navigationSummary={navigationSummary}
          initialPreferredName={getPreferredName(currentUser)}
        />
      )}
      <div className={`bg-gradient-to-br from-stocksense-teal/10 via-stocksense-sky/10 to-stocksense-lime/10 ${currentUser?.id ? "wherekeep-auth-shell" : ""}`}>
        {children}
      </div>
    </>
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getPreferenceBootScript() }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {currentUser?.id ? (
          <Providers isAuthenticated>{pageContent}</Providers>
        ) : (
          pageContent
        )}
      </body>
    </html>
  );
}
