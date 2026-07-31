import { Suspense } from "react";
import Navigation from "@/components/app-shell/Navigation";
import LazySupportChatbot from "@/components/app-shell/LazySupportChatbot";
import InviteAcceptedModal from "@/components/auth/InviteAcceptedModal";
import InvitePasswordSetupModal from "@/components/auth/InvitePasswordSetupModal";
import { Providers } from "@/components/app-shell/Providers";
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

  return (
    <Providers isAuthenticated>
      <Navigation
        canEditInventory={canEditInventory}
        attentionCounts={attentionCounts}
        navigationSummary={navigationSummary}
        initialPreferredName={getPreferredName(currentUser)}
      />
      <div className="wherekeep-auth-shell bg-gradient-to-br from-stocksense-teal/10 via-stocksense-sky/10 to-stocksense-lime/10">
        {children}
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
