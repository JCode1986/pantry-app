import { redirect } from "next/navigation";
import ProfileClient from "@/components/profile/ProfileClient";
import { getSessionForLayout } from "@/app/actions/auth";
import { getUserBillingAction } from "@/app/actions/billing";
import { getHouseholdSharingAction } from "@/app/actions/household";
import { getUserPreferencesAction } from "@/app/actions/preferences";
import { DEFAULT_PREFERENCES } from "@/utils/appPreferences";
import { createPageMetadata } from "@/utils/metadata";

export const metadata = createPageMetadata({
  title: "Profile",
  description: "Manage account security, appearance, billing, and family sharing.",
  path: "/profile",
});

function formatAccountDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default async function ProfilePage() {
  const session = await getSessionForLayout();
  const token = session?.user?.access_token;
  const account = session?.user?.user;

  if (!token || !account) {
    redirect("/login?redirectTo=/profile");
  }

  const user = {
    id: account.id ?? "",
    email: account.email ?? "Unknown email",
    role: account.role ?? account.aud ?? "authenticated",
    provider:
      account.app_metadata?.provider ??
      account.identities?.[0]?.provider ??
      "email",
    emailConfirmed: Boolean(account.email_confirmed_at || account.confirmed_at),
    createdAtLabel: formatAccountDate(account.created_at),
    lastSignInLabel: formatAccountDate(account.last_sign_in_at),
    requiresPasswordSetup: Boolean(account.user_metadata?.requires_password_setup),
  };
  const preferencesResult = await getUserPreferencesAction();
  const preferences = preferencesResult?.data ?? DEFAULT_PREFERENCES;
  const billingResult = await getUserBillingAction();
  const billing = billingResult?.data ?? {
    planId: "free",
    status: "free",
    stripePriceId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    hasStripeCustomer: false,
  };
  const sharingResult = await getHouseholdSharingAction();

  return (
    <main className="page-enter mx-auto min-h-[100vh] max-w-6xl px-5 py-8">
      <ProfileClient
        user={user}
        initialPreferences={preferences}
        initialBilling={billing}
        initialSharing={sharingResult?.data ?? null}
        initialSharingError={sharingResult?.error ?? null}
      />
    </main>
  );
}
