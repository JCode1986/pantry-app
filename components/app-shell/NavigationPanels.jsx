"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Input } from "@heroui/react";
import {
  FaCopy,
  FaEnvelope,
  FaSpinner,
  FaTimes,
  FaTimesCircle,
  FaUserPlus,
} from "react-icons/fa";
import { LuMail } from "react-icons/lu";
import NativeSelect from "@/components/ui/NativeSelect";
import {
  FONT_OPTIONS,
  THEME_OPTIONS,
  getFontById,
  getThemeById,
} from "@/utils/appPreferences";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const HOUSEHOLD_ROLE_OPTIONS = [
  { id: "editor", label: "Editor" },
  { id: "viewer", label: "Viewer" },
];

function formatHouseholdRole(role) {
  if (role === "owner") return "Owner";
  if (role === "viewer") return "Viewer";
  if (role === "editor") return "Editor";
  return "";
}

function formatPanelDate(value) {
  if (!value) return null;

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

export function HouseholdSharingPanel({
  activePanel,
  activeTab,
  sharing,
  loading,
  actionLoading,
  error,
  message,
  inviteEmail,
  inviteRole,
  copiedInviteId,
  onClose,
  onSelectTab,
  onInviteEmailChange,
  onInviteRoleChange,
  onCreateInvite,
  onCopyInvite,
  onResendInvite,
  onRevokeInvite,
  onUpdateMemberRole,
  onRequestRemoveMember,
}) {
  const members = sharing?.members ?? [];
  const invites = sharing?.invites ?? [];
  const pendingInviteCount = invites.filter((invite) => invite.status === "pending").length;
  const isMembersTab = activeTab === "members";
  const isFamily = sharing?.effectivePlanId === "family";
  const isOwner = sharing?.currentUserRole === "owner";
  const canInvite = Boolean(sharing?.canInvite);
  const title = isMembersTab ? "Household members" : "Household invites";
  const subtitle = isMembersTab
    ? "People who can access this household inventory."
    : "Pending and recent household invitations.";

  return (
    <AnimatePresence>
      {activePanel === "members" && (
        <motion.div
          className="fixed bottom-0 right-0 top-0 z-[45] hidden transition-[left] duration-200 lg:block"
          style={{ left: "var(--wherekeep-sidebar-offset)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <button
            type="button"
            aria-label="Close household panel"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-slate-950/5"
          />
          <motion.aside
            className="absolute bottom-4 left-4 top-4 flex flex-col overflow-hidden rounded-3xl border border-[var(--stocksense-brand-border)] bg-white shadow-2xl transition-[width] duration-200"
            style={{
              width: "min(420px, calc(100vw - var(--wherekeep-sidebar-offset) - 2rem))",
            }}
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="border-b border-gray-100 px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
                    Household
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-gray-950">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                  aria-label="Close panel"
                >
                  <FaTimes className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => onSelectTab("members")}
                  className={cx(
                    "rounded-xl px-3 py-2 text-sm font-semibold transition",
                    isMembersTab
                      ? "bg-white text-[var(--stocksense-brand)] shadow-sm"
                      : "text-gray-500 hover:text-[var(--stocksense-brand)]"
                  )}
                >
                  Members
                  {members.length > 0 && (
                    <span className="ml-2 text-xs text-gray-400">{members.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab("invites")}
                  className={cx(
                    "rounded-xl px-3 py-2 text-sm font-semibold transition",
                    !isMembersTab
                      ? "bg-white text-[var(--stocksense-brand)] shadow-sm"
                      : "text-gray-500 hover:text-[var(--stocksense-brand)]"
                  )}
                >
                  Invites
                  {pendingInviteCount > 0 && (
                    <span className="ml-2 text-xs text-gray-400">
                      {pendingInviteCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {loading && (
                <div className="grid min-h-48 place-items-center rounded-2xl border border-gray-100 bg-gray-50 text-sm font-medium text-gray-500">
                  <span className="inline-flex items-center gap-2">
                    <FaSpinner className="h-4 w-4 animate-spin text-[var(--stocksense-brand)]" />
                    Loading household details
                  </span>
                </div>
              )}

              {!loading && error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {!loading && !error && message && (
                <div
                  className={cx(
                    "mb-4 rounded-2xl border px-4 py-3 text-sm",
                    message.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  )}
                  role={message.type === "success" ? "status" : "alert"}
                >
                  {message.text}
                </div>
              )}

              {!loading && !error && isMembersTab && (
                <div className="space-y-3">
                  {members.length > 0 ? (
                    members.map((member) => {
                      const memberLabel = member.displayName || member.email;
                      const showEmail = Boolean(member.displayName && member.email);

                      return (
                        <div
                          key={member.userId || member.email}
                          className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-3 shadow-sm"
                        >
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-sm font-bold uppercase text-[var(--stocksense-brand)]">
                            {(memberLabel || "?").slice(0, 1)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-950">
                              {memberLabel}
                            </p>
                            {showEmail && (
                              <p className="mt-0.5 truncate text-xs text-gray-500">
                                {member.email}
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-gray-500">
                              Joined {formatPanelDate(member.joinedAt) ?? "recently"}
                            </p>
                            {isOwner && member.role !== "owner" && (
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <NativeSelect
                                  aria-label={`Role for ${memberLabel}`}
                                  value={member.role === "viewer" ? "viewer" : "editor"}
                                  onChange={(value) => {
                                    if (value) onUpdateMemberRole(member, String(value));
                                  }}
                                  disabled={Boolean(actionLoading)}
                                  className="w-28"
                                  triggerClassName="h-9 text-xs"
                                  options={HOUSEHOLD_ROLE_OPTIONS.map((role) => ({
                                    value: role.id,
                                    label: role.label,
                                  }))}
                                />
                                <Button
                                  size="sm"
                                  variant="flat"
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2 text-rose-700"
                                  onPress={() => onRequestRemoveMember(member)}
                                  isDisabled={Boolean(actionLoading)}
                                  startContent={<FaTimesCircle className="h-3.5 w-3.5" />}
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                          </div>
                          <span className="rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--stocksense-brand)]">
                            {formatHouseholdRole(member.role)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-gray-900">
                        No members yet
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Household members will appear here once they join.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!loading && !error && !isMembersTab && !isFamily && isOwner && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Upgrade to Family to invite household members.{" "}
                  <Link href="/profile#billing" className="font-semibold underline">
                    View Family plan
                  </Link>
                </div>
              )}

              {!loading && !error && !isMembersTab && isFamily && !isOwner && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-gray-900">
                    Owner access required
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Only the household owner can invite and manage members.
                  </p>
                </div>
              )}

              {!loading && !error && !isMembersTab && !isFamily && !isOwner && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-gray-900">
                    Family plan required
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Household invites are available on the Family plan.
                  </p>
                </div>
              )}

              {!loading && !error && !isMembersTab && isFamily && isOwner && (
                <div className="space-y-3">
                  <form
                    onSubmit={onCreateInvite}
                    className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3"
                  >
                    <div className="space-y-3">
                      <Input
                        label="Invite by email"
                        type="email"
                        value={inviteEmail}
                        onValueChange={onInviteEmailChange}
                        isDisabled={Boolean(actionLoading) || !canInvite}
                        classNames={{
                          inputWrapper: "rounded-xl border border-stocksense-gray bg-white shadow-none",
                        }}
                      />
                      <div className="flex items-end gap-2">
                        <NativeSelect
                          label="Role"
                          aria-label="Invite role"
                          value={inviteRole}
                          onChange={(value) => {
                            if (value) onInviteRoleChange(String(value));
                          }}
                          disabled={Boolean(actionLoading) || !canInvite}
                          className="min-w-0 flex-1"
                          triggerClassName="h-14"
                          options={HOUSEHOLD_ROLE_OPTIONS.map((role) => ({
                            value: role.id,
                            label: role.label,
                          }))}
                        />
                        <Button
                          type="submit"
                          className="h-14 rounded-xl bg-[var(--stocksense-brand)] px-4 text-white"
                          isLoading={actionLoading === "invite"}
                          isDisabled={Boolean(actionLoading) || !canInvite}
                          startContent={<FaUserPlus className="h-3.5 w-3.5" />}
                        >
                          Send
                        </Button>
                      </div>
                      {!canInvite && (
                        <p className="text-xs text-amber-700">
                          This household is at the Family member limit.
                        </p>
                      )}
                    </div>
                  </form>

                  {invites.length > 0 ? (
                    invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="rounded-2xl border border-gray-100 bg-white px-3 py-3 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                            <LuMail className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-950">
                              {invite.email}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {formatHouseholdRole(invite.role)} access
                              {invite.expiresAt
                                ? ` - Expires ${formatPanelDate(invite.expiresAt)}`
                                : ""}
                            </p>
                          </div>
                          <span
                            className={cx(
                              "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                              (invite.status ?? "pending") === "pending"
                                ? "border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                                : "border border-gray-200 bg-gray-50 text-gray-500"
                            )}
                          >
                            {invite.status ?? "pending"}
                          </span>
                        </div>
                        {isOwner && (
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            {invite.link && (
                              <Button
                                size="sm"
                                variant="flat"
                                className="rounded-lg border border-gray-200 bg-white text-gray-700"
                                onPress={() => onCopyInvite(invite)}
                                isDisabled={Boolean(actionLoading)}
                                startContent={<FaCopy className="h-3.5 w-3.5" />}
                              >
                                {copiedInviteId === invite.id ? "Copied" : "Copy"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="flat"
                              className="rounded-lg border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                              onPress={() => onResendInvite(invite.id)}
                              isLoading={actionLoading === `resend:${invite.id}`}
                              isDisabled={
                                Boolean(actionLoading) &&
                                actionLoading !== `resend:${invite.id}`
                              }
                              startContent={<FaEnvelope className="h-3.5 w-3.5" />}
                            >
                              Resend
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700"
                              onPress={() => onRevokeInvite(invite.id)}
                              isLoading={actionLoading === `revoke:${invite.id}`}
                              isDisabled={
                                Boolean(actionLoading) &&
                                actionLoading !== `revoke:${invite.id}`
                              }
                              startContent={<FaTimesCircle className="h-3.5 w-3.5" />}
                            >
                              Revoke
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-gray-900">
                        No invites
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Pending household invites will appear here.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PreferencesPanel({
  isOpen,
  preferences,
  preferredName,
  saving,
  canCustomizeAppearance,
  message,
  onClose,
  onThemeChange,
  onFontChange,
  onPreferredNameChange,
  onSavePreferredName,
}) {
  const selectedTheme = getThemeById(preferences.themeId);
  const selectedFont = getFontById(preferences.fontId);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed bottom-0 right-0 top-0 z-[45] hidden transition-[left] duration-200 lg:block"
          style={{ left: "var(--wherekeep-sidebar-offset)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <button
            type="button"
            aria-label="Close preferences panel"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-slate-950/5"
          />
          <motion.aside
            className="absolute bottom-4 left-4 top-4 flex flex-col overflow-hidden rounded-3xl border border-[var(--stocksense-brand-border)] bg-white shadow-2xl transition-[width] duration-200"
            style={{
              width: "min(420px, calc(100vw - var(--wherekeep-sidebar-offset) - 2rem))",
            }}
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Preferences"
          >
            <div className="border-b border-gray-100 px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--stocksense-brand)]">
                    Account
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-gray-950">
                    Preferences
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Set how WhereKeep looks and what it should call you.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                  aria-label="Close panel"
                >
                  <FaTimes className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {message && (
                <div
                  className={cx(
                    "rounded-2xl border px-4 py-3 text-sm",
                    message.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  )}
                  role={message.type === "success" ? "status" : "alert"}
                >
                  {message.text}
                </div>
              )}

              <form
                onSubmit={onSavePreferredName}
                className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3"
              >
                <Input
                  label="What should we call you?"
                  value={preferredName}
                  onValueChange={onPreferredNameChange}
                  placeholder="First name or nickname"
                  classNames={{
                    inputWrapper: "rounded-xl border border-stocksense-gray bg-white shadow-none",
                  }}
                />
                <Button
                  type="submit"
                  className="mt-3 rounded-xl bg-[var(--stocksense-brand)] text-white"
                  isDisabled={saving}
                  isLoading={saving}
                >
                  Save name
                </Button>
              </form>

              <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${selectedTheme.swatch}, ${selectedTheme.border})`,
                    }}
                  >
                    Aa
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-950">
                      {selectedTheme.label} with {selectedFont.label}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Changes apply across this app when saved.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {!canCustomizeAppearance && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                      Theme and font customization is included with Plus and Family.{" "}
                      <Link href="/profile#billing" className="font-semibold underline">
                        View plans
                      </Link>
                    </div>
                  )}

                  <NativeSelect
                    label="Color theme"
                    aria-label="Color theme"
                    value={preferences.themeId}
                    onChange={onThemeChange}
                    disabled={saving || !canCustomizeAppearance}
                    options={THEME_OPTIONS.map((theme) => ({
                      value: theme.id,
                      label: `${theme.label} - ${theme.description}`,
                    }))}
                  />
                  <NativeSelect
                    label="Font"
                    aria-label="Font"
                    value={preferences.fontId}
                    onChange={onFontChange}
                    disabled={saving || !canCustomizeAppearance}
                    options={FONT_OPTIONS.map((font) => ({
                      value: font.id,
                      label: `${font.label} - ${font.description}`,
                    }))}
                  />
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
