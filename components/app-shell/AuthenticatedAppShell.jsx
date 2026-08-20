import { Suspense } from "react";
import Navigation from "@/components/app-shell/Navigation";
import LazySupportChatbot from "@/components/app-shell/LazySupportChatbot";
import RouteContentTransition from "@/components/app-shell/RouteContentTransition";
import InviteAcceptedModal from "@/components/auth/InviteAcceptedModal";
import InvitePasswordSetupModal from "@/components/auth/InvitePasswordSetupModal";
import { Providers } from "@/components/app-shell/Providers";
import { getUserPreferencesAction } from "@/app/actions/preferences";
import {
  DEFAULT_PREFERENCES,
  getPreferenceApplyScript,
} from "@/utils/appPreferences";
import {
  getAuthenticatedAppShellState,
  getPreferredName,
  needsInvitePasswordSetup,
} from "@/components/app-shell/authenticatedShellState";

export default async function AuthenticatedAppShell({ children }) {
  const {
    currentUser,
    canEditInventory,
    attentionCounts,
    navigationSummary,
  } = await getAuthenticatedAppShellState();

  if (!currentUser?.id) {
    return children;
  }

  const preferencesResult = await getUserPreferencesAction();
  const preferences = preferencesResult?.data ?? DEFAULT_PREFERENCES;

  return (
    <Providers isAuthenticated initialPreferences={preferences}>
      <script
        dangerouslySetInnerHTML={{
          __html: getPreferenceApplyScript(preferences, { persist: true }),
        }}
      />
      <Navigation
        canEditInventory={canEditInventory}
        attentionCounts={attentionCounts}
        navigationSummary={navigationSummary}
        initialPreferences={preferences}
        initialPreferredName={getPreferredName(currentUser)}
      />
      <div className="wherekeep-auth-shell bg-gradient-to-br from-stocksense-teal/10 via-stocksense-sky/10 to-stocksense-lime/10">
        <RouteContentTransition>{children}</RouteContentTransition>
      </div>
      <InvitePasswordSetupModal
        requiresPasswordSetup={needsInvitePasswordSetup(currentUser)}
      />
      <Suspense fallback={null}>
        <InviteAcceptedModal />
      </Suspense>
      <LazySupportChatbot />
    </Providers>
  );
}
