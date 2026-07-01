import AcceptInviteClient from "@/components/auth/AcceptInviteClient";
import { getSessionForLayout } from "@/app/actions/auth";
import { getHouseholdInvitePreviewAction } from "@/app/actions/household";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";

export async function generateMetadata({ params }) {
  const { token } = await params;
  const previewResult = await getHouseholdInvitePreviewAction(token);
  const householdName = previewResult?.data?.householdName ?? "Household";

  return createPageMetadata({
    title: "Household Invite",
    description: `Accept your invitation to join ${householdName} on WhereKeep.`,
    path: `/invite/${token}`,
    robots: NO_INDEX_ROBOTS,
  });
}

export default async function InvitePage({ params }) {
  const { token } = await params;
  const session = await getSessionForLayout();
  const account = session?.user?.user;
  const previewResult = await getHouseholdInvitePreviewAction(token);

  return (
    <AcceptInviteClient
      token={token}
      preview={previewResult?.data ?? null}
      previewError={previewResult?.error ?? null}
      isAuthenticated={Boolean(session?.user?.access_token && account?.id)}
      userEmail={account?.email ?? null}
    />
  );
}
