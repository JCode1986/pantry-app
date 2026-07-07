"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import {
  FaBoxOpen,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaClipboard,
  FaCopy,
  FaCreditCard,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaExternalLinkAlt,
  FaFont,
  FaIdBadge,
  FaKey,
  FaMapMarkedAlt,
  FaPalette,
  FaRedo,
  FaShieldAlt,
  FaTags,
  FaTimesCircle,
  FaUserCircle,
  FaUserFriends,
  FaUserPlus,
  FaWarehouse,
} from "react-icons/fa";
import { updatePasswordAction } from "@/app/actions/auth";
import {
  createBillingPortalSessionAction,
  createCheckoutSessionAction,
} from "@/app/actions/billing";
import {
  createHouseholdInviteAction,
  removeHouseholdMemberAction,
  revokeHouseholdInviteAction,
  updateHouseholdMemberRoleAction,
} from "@/app/actions/household";
import {
  BILLING_INTERVALS,
  BILLING_PLANS,
  getEffectivePlanId,
  getBillingPlan,
} from "@/utils/billingPlans";
import {
  DEFAULT_PREFERENCES,
  FONT_OPTIONS,
  THEME_OPTIONS,
  getFontById,
  getThemeById,
  saveStoredPreferences,
} from "@/utils/appPreferences";
import { updateUserPreferencesAction } from "@/app/actions/preferences";
import { themedSelectClassNames } from "@/components/modals/modalTheme";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";

const sectionVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, type: "spring", stiffness: 130 },
  },
};

const HOUSEHOLD_ROLE_OPTIONS = [
  {
    id: "editor",
    label: "Editor",
    description: "Can add, edit, move, delete, and manage shopping list items.",
  },
  {
    id: "viewer",
    label: "Viewer",
    description: "Can view inventory, shopping list, and recent activity only.",
  },
];

function formatHouseholdRole(role) {
  if (role === "owner") return "Owner";
  if (role === "viewer") return "Viewer";
  return "Editor";
}

function StatusMessage({ type, children }) {
  const isSuccess = type === "success";

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -6, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`overflow-hidden rounded-xl border px-3 py-2 text-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
      role={isSuccess ? "status" : "alert"}
    >
      {children}
    </motion.div>
  );
}

function PasswordSetupNotice() {
  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-amber-700 shadow-sm">
          <FaKey className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Set a password to continue</h2>
          <p className="mt-1 text-sm text-amber-800">
            You joined through an invite link. Use the Change password form below before using the dashboard.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-stocksense-gray bg-gray-50/60 px-3 py-3">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[var(--stocksense-brand)] shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </div>
        <div className="mt-0.5 break-words text-sm font-medium text-gray-800">
          {value}
        </div>
      </div>
    </div>
  );
}

function ShortcutButton({ href, icon: Icon, label, description }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-stocksense-gray bg-white px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] transition group-hover:bg-white">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-800">{label}</span>
        <span className="block truncate text-xs text-gray-500">{description}</span>
      </span>
    </Link>
  );
}

function LegalResourceButton({ href, label, description }) {
  return (
    <Link
      href={href}
      className="flex items-start justify-between gap-3 rounded-xl border border-stocksense-gray bg-gray-50/60 px-3 py-3 transition hover:border-[var(--stocksense-brand-border)] hover:bg-[var(--stocksense-brand-soft)]"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-800">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-gray-500">
          {description}
        </span>
      </span>
      <FaExternalLinkAlt className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--stocksense-brand)]" />
    </Link>
  );
}

function MobileProfileCard({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-stocksense-gray bg-white p-4 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function MobileSectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-gray-950">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm leading-5 text-gray-500">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

const MOBILE_PROFILE_DROPDOWN_TRANSITION = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1],
};

function MobileAccordionCard({
  icon: Icon,
  title,
  summary,
  children,
  defaultOpen = false,
  id,
  isOpen: controlledOpen,
  onOpenChange,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen ?? internalOpen;
  const toggleOpen = () => {
    const nextOpen = !isOpen;
    if (onOpenChange) onOpenChange(nextOpen);
    else setInternalOpen(nextOpen);
  };

  return (
    <section
      id={id}
      className="overflow-hidden rounded-2xl border border-stocksense-gray bg-white shadow-sm"
    >
      <button
        type="button"
        className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
        onClick={toggleOpen}
        aria-expanded={isOpen}
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
          <Icon className="h-4 w-4" />
        </div>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-gray-950">{title}</span>
          {summary ? (
            <span className="mt-0.5 block truncate text-sm text-gray-500">
              {summary}
            </span>
          ) : null}
        </span>
        <FaChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-[var(--stocksense-brand)] transition-transform duration-200 ease-out ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -4 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -4 }}
            transition={MOBILE_PROFILE_DROPDOWN_TRANSITION}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="px-4 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function MobileInlineAccordion({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <button
        type="button"
        className="flex min-h-11 w-full cursor-pointer items-center justify-between px-3 text-left text-sm font-semibold text-gray-900"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
      >
        {title}
        <FaChevronDown
          className={`h-3.5 w-3.5 text-[var(--stocksense-brand)] transition-transform duration-200 ease-out ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -4 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -4 }}
            transition={MOBILE_PROFILE_DROPDOWN_TRANSITION}
            className="overflow-hidden border-t border-gray-200"
          >
            <div className="p-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileInfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 py-2.5 last:border-b-0">
      <span className="shrink-0 text-sm text-gray-500">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-medium text-gray-900">
        {value}
      </span>
    </div>
  );
}

function AppearancePreview({ theme, font }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] p-3">
        <div className="flex items-center gap-3">
          <span
            className="h-10 w-10 shrink-0 rounded-xl border border-black/5 shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${theme.swatch}, ${theme.border})`,
            }}
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-800">
              {theme.label}
            </span>
            <span className="block text-xs text-gray-500">{theme.description}</span>
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-stocksense-gray bg-white p-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
            <FaFont className="h-4 w-4" />
          </span>
          <span className="min-w-0" style={{ fontFamily: font.family }}>
            <span className="block text-sm font-semibold text-gray-800">
              {font.label}
            </span>
            <span className="block text-xs text-gray-500">{font.description}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function formatBillingDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function BillingPlanButton({
  plan,
  interval,
  currentPlanId,
  onCheckout,
  isLoading,
}) {
  const isCurrent = currentPlanId === plan.id;
  const price =
    interval === BILLING_INTERVALS.yearly ? plan.yearlyPrice : plan.monthlyPrice;
  const label = interval === BILLING_INTERVALS.yearly ? "yearly" : "monthly";

  return (
    <Button
      variant={isCurrent ? "flat" : "solid"}
      className={`rounded-xl ${
        isCurrent
          ? "border border-stocksense-gray bg-white text-gray-600"
          : "bg-[var(--stocksense-brand)] text-white"
      }`}
      isDisabled={isLoading || isCurrent}
      isLoading={isLoading}
      onPress={() => onCheckout(plan.id, interval)}
    >
      {isCurrent ? "Current plan" : `${price} ${label}`}
    </Button>
  );
}

function BillingSection({ billing, billingError, billingLoading, onCheckout, onPortal }) {
  const currentPlanId = getEffectivePlanId(billing);
  const currentPlan = getBillingPlan(currentPlanId);
  const renewalDate = formatBillingDate(billing.currentPeriodEnd);
  const paidPlans = BILLING_PLANS.filter((plan) => plan.id !== "free");

  return (
    <motion.section
      id="billing"
      variants={itemVariants}
      className="rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
          <FaCreditCard className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
          <p className="mt-1 text-sm text-gray-500">
            Current plan: {currentPlan.name}
            {billing.status ? ` (${billing.status})` : ""}.
          </p>
        </div>
      </div>

      {renewalDate && (
        <div
          className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
            billing.cancelAtPeriodEnd
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-gray-200 bg-gray-50 text-gray-700"
          }`}
        >
          {billing.cancelAtPeriodEnd
            ? `Your plan is canceled and access ends on ${renewalDate}.`
            : `Your plan renews on ${renewalDate}.`}
        </div>
      )}

      {billingError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {billingError}
        </div>
      )}

      <div className="mt-5 space-y-4">
        {paidPlans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-xl border border-stocksense-gray bg-gray-50/60 p-3"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-xs text-gray-500">{plan.audience}</p>
              </div>
              {currentPlanId === plan.id ? (
                <span className="w-max rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  Current plan
                </span>
              ) : plan.featured && (
                <span className="w-max rounded-full bg-[var(--stocksense-brand-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--stocksense-brand)]">
                  Popular
                </span>
              )}
            </div>
            {currentPlanId === plan.id ? (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                This plan is active. Use Manage billing for card, renewal, or cancellation changes.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <BillingPlanButton
                  plan={plan}
                  interval={BILLING_INTERVALS.monthly}
                  currentPlanId={currentPlanId}
                  onCheckout={onCheckout}
                  isLoading={billingLoading === `${plan.id}:monthly`}
                />
                <BillingPlanButton
                  plan={plan}
                  interval={BILLING_INTERVALS.yearly}
                  currentPlanId={currentPlanId}
                  onCheckout={onCheckout}
                  isLoading={billingLoading === `${plan.id}:yearly`}
                />
              </div>
            )}
          </div>
        ))}

        <Button
          variant="flat"
          className="w-full rounded-xl border border-stocksense-gray bg-white text-gray-700"
          onPress={onPortal}
          isLoading={billingLoading === "portal"}
          isDisabled={billingLoading === "portal" || !billing.hasStripeCustomer}
          startContent={<FaExternalLinkAlt className="h-3.5 w-3.5" />}
        >
          {billing.hasStripeCustomer ? "Manage billing" : "Billing portal available after checkout"}
        </Button>
      </div>
    </motion.section>
  );
}

function BillingReturnNotice() {
  const searchParams = useSearchParams();
  const billingStatus = searchParams.get("billing");

  if (billingStatus === "success") {
    return (
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm"
      >
        Checkout complete. Your subscription is being activated; if the plan still
        looks unchanged, refresh in a moment after Stripe finishes syncing.
      </motion.div>
    );
  }

  if (billingStatus === "cancelled") {
    return (
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm"
      >
        Checkout was cancelled. Your current plan was not changed.
      </motion.div>
    );
  }

  return null;
}

function SharingSection({
  sharing,
  sharingError,
  sharingMessage,
  inviteEmail,
  inviteRole,
  onInviteEmailChange,
  onInviteRoleChange,
  onCreateInvite,
  onCopyInvite,
  onRevokeInvite,
  onRemoveMember,
  onUpdateMemberRole,
  copiedInviteId,
  loading,
}) {
  const isFamily = sharing?.effectivePlanId === "family";
  const isOwner = sharing?.currentUserRole === "owner";
  const members = sharing?.members ?? [];
  const invites = sharing?.invites ?? [];
  const maxMembers = sharing?.maxMembers ?? null;
  const memberLimitLabel =
    maxMembers === null
      ? `${sharing?.memberCount ?? members.length} members`
      : `${sharing?.memberCount ?? members.length}/${maxMembers} members`;

  return (
    <motion.section
      variants={itemVariants}
      className="rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
          <FaUserFriends className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Family sharing</h2>
          <p className="mt-1 text-sm text-gray-500">
            Share one inventory with the people in your household.
          </p>
        </div>
      </div>

      {sharingError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {sharingError}
        </div>
      )}

      {sharing && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-stocksense-gray bg-gray-50/60 px-3 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {sharing.household?.name ?? "My Household"}
                </div>
                <div className="text-xs text-gray-500">
                  {isFamily ? `Family plan active - ${memberLimitLabel}` : "Family plan required for invites"}
                </div>
              </div>
              <span className="w-max rounded-full bg-[var(--stocksense-brand-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--stocksense-brand)]">
                {formatHouseholdRole(sharing.currentUserRole)}
              </span>
            </div>
          </div>

          {!isFamily && isOwner && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              Upgrade to Family to invite up to 5 household members.{" "}
              <Link href="#billing" className="font-semibold underline">
                View Family plan
              </Link>
            </div>
          )}

          {isFamily && !isOwner && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              {sharing.currentUserRole === "viewer"
                ? "You have view-only access. You can browse inventory, shopping list, and activity without changing household data."
                : "You can view and manage this shared inventory. Only the household owner can invite new members."}
            </div>
          )}

          {isFamily && isOwner && (
            <form onSubmit={onCreateInvite} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                <Input
                  label="Invite by email"
                  type="email"
                  value={inviteEmail}
                  onValueChange={onInviteEmailChange}
                  isDisabled={loading === "invite" || !sharing.canInvite}
                  classNames={{
                    inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
                  }}
                />
                <Select
                  label="Role"
                  selectedKeys={new Set([inviteRole])}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0];
                    if (value) onInviteRoleChange(String(value));
                  }}
                  isDisabled={loading === "invite" || !sharing.canInvite}
                  variant="bordered"
                  radius="lg"
                  classNames={themedSelectClassNames}
                >
                  {HOUSEHOLD_ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.id} textValue={role.label}>
                      {role.label} - {role.description}
                    </SelectItem>
                  ))}
                </Select>
                <Button
                  type="submit"
                  className="h-14 rounded-xl bg-[var(--stocksense-brand)] px-5 text-white lg:self-end"
                  isLoading={loading === "invite"}
                  isDisabled={loading === "invite" || !sharing.canInvite}
                  startContent={<FaUserPlus className="h-3.5 w-3.5" />}
                >
                  Send invite
                </Button>
              </div>

              {!sharing.canInvite && (
                <p className="text-xs text-amber-700">
                  This household is at the Family member limit.
                </p>
              )}
            </form>
          )}

          {sharingMessage && (
            <div
              className={`rounded-xl border px-3 py-2 text-sm ${
                sharingMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
              role={sharingMessage.type === "success" ? "status" : "alert"}
            >
              {sharingMessage.text}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Members</h3>
            <div className="mt-3 space-y-2">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stocksense-gray bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-800">
                      {member.email}
                    </div>
                    <div className="text-xs capitalize text-gray-500">
                      {formatHouseholdRole(member.role)}
                    </div>
                  </div>
                  {isOwner && member.role !== "owner" ? (
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                      <Select
                        aria-label={`Role for ${member.email}`}
                        size="sm"
                        selectedKeys={new Set([member.role === "viewer" ? "viewer" : "editor"])}
                        onSelectionChange={(keys) => {
                          const value = Array.from(keys)[0];
                          if (value) onUpdateMemberRole(member, String(value));
                        }}
                        isDisabled={loading === `role:${member.userId}`}
                        variant="bordered"
                        radius="lg"
                        className="w-36"
                        classNames={themedSelectClassNames}
                      >
                        {HOUSEHOLD_ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role.id}>{role.label}</SelectItem>
                        ))}
                      </Select>
                      <Button
                        size="sm"
                        variant="flat"
                        className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700"
                        onPress={() => onRemoveMember(member)}
                        isLoading={loading === `remove:${member.userId}`}
                        startContent={<FaTimesCircle className="h-3.5 w-3.5" />}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <FaCheckCircle className="h-4 w-4 shrink-0 text-[var(--stocksense-brand)]" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {isOwner && invites.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Pending invites</h3>
              <div className="mt-3 space-y-2">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="rounded-xl border border-stocksense-gray bg-white px-3 py-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-800">
                          {invite.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatHouseholdRole(invite.role)} access - Expires{" "}
                          {formatBillingDate(invite.expiresAt) ?? "soon"}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          className="rounded-lg border border-stocksense-gray bg-white text-gray-700"
                          onPress={() => onCopyInvite(invite)}
                          startContent={<FaCopy className="h-3.5 w-3.5" />}
                        >
                          {copiedInviteId === invite.id ? "Copied" : "Copy"}
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700"
                          onPress={() => onRevokeInvite(invite.id)}
                          isLoading={loading === `revoke:${invite.id}`}
                          startContent={<FaTimesCircle className="h-3.5 w-3.5" />}
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
}

export default function ProfileClient({
  user,
  initialPreferences = DEFAULT_PREFERENCES,
  initialBilling = {
    planId: "free",
    status: "free",
    stripePriceId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    hasStripeCustomer: false,
  },
  initialSharing = null,
  initialSharingError = null,
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(
    Boolean(user?.requiresPasswordSetup)
  );
  const [submitted, setSubmitted] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [appearanceMessage, setAppearanceMessage] = useState(null);
  const [billing, setBilling] = useState(initialBilling);
  const [billingLoading, setBillingLoading] = useState(null);
  const [billingError, setBillingError] = useState(null);
  const [sharing, setSharing] = useState(initialSharing);
  const [sharingError, setSharingError] = useState(initialSharingError);
  const [sharingMessage, setSharingMessage] = useState(null);
  const [sharingLoading, setSharingLoading] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [removeMemberCandidate, setRemoveMemberCandidate] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [mobileBillingOpen, setMobileBillingOpen] = useState(false);
  const mobileBillingScrollTimerRef = useRef(null);

  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;
  const showPasswordError = submitted && !passwordValid;
  const showConfirmError = submitted && passwordValid && !passwordsMatch;
  const selectedTheme = getThemeById(preferences.themeId);
  const selectedFont = getFontById(preferences.fontId);
  const effectivePlanId = getEffectivePlanId(billing);
  const appearancePlanId = sharing?.effectivePlanId || effectivePlanId;
  const canCustomizeAppearance = appearancePlanId !== "free";
  const currentPlan = getBillingPlan(effectivePlanId);
  const renewalDate = formatBillingDate(billing.currentPeriodEnd);
  const paidPlans = BILLING_PLANS.filter((plan) => plan.id !== "free");
  const sharingMembers = sharing?.members ?? [];
  const sharingInvites = sharing?.invites ?? [];
  const sharingIsFamily = sharing?.effectivePlanId === "family";
  const sharingIsOwner = sharing?.currentUserRole === "owner";
  const sharingMaxMembers = sharing?.maxMembers ?? null;
  const sharingMemberCount = sharing?.memberCount ?? sharingMembers.length;
  const sharingMemberLimitLabel =
    sharingMaxMembers === null
      ? `${sharingMemberCount} members`
      : `${sharingMemberCount}/${sharingMaxMembers} members`;
  const accountStatus = user.emailConfirmed ? "Active" : "Email pending";

  const initials = useMemo(() => {
    const email = user?.email || "";
    return email.slice(0, 2).toUpperCase() || "WK";
  }, [user?.email]);

  useEffect(() => {
    setPreferences(saveStoredPreferences(initialPreferences));
  }, [initialPreferences]);

  useEffect(() => {
    setBilling(initialBilling);
  }, [initialBilling]);

  useEffect(() => {
    setRequiresPasswordSetup(Boolean(user?.requiresPasswordSetup));
  }, [user?.requiresPasswordSetup]);

  useEffect(() => {
    setSharing(initialSharing);
    setSharingError(initialSharingError);
  }, [initialSharing, initialSharingError]);

  useEffect(() => {
    return () => {
      if (mobileBillingScrollTimerRef.current) {
        window.clearTimeout(mobileBillingScrollTimerRef.current);
      }
    };
  }, []);

  const centerMobileBilling = (delay = 0) => {
    if (mobileBillingScrollTimerRef.current) {
      window.clearTimeout(mobileBillingScrollTimerRef.current);
    }

    mobileBillingScrollTimerRef.current = window.setTimeout(() => {
      mobileBillingScrollTimerRef.current = null;
      document.getElementById("mobile-billing")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, delay);
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const openFromHash = () => {
      if (window.location.hash !== "#mobile-billing") return;
      setMobileBillingOpen(true);
      centerMobileBilling(260);
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);

    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  const handleMobileBillingLink = (event) => {
    event.preventDefault();
    setMobileBillingOpen(true);

    if (window.location.hash !== "#mobile-billing") {
      window.history.pushState(null, "", "#mobile-billing");
    }

    centerMobileBilling(mobileBillingOpen ? 0 : 260);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
    setSuccess(null);

    if (!passwordValid) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      const result = await updatePasswordAction({ password });

      if (!result?.success) {
        setError(result?.error || "Could not update password.");
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setSubmitted(false);
      setSuccess("Password updated successfully.");
      setRequiresPasswordSetup(false);
    } catch (err) {
      setError(err?.message || "Could not update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCopyUserId = async () => {
    if (!user?.id || !navigator?.clipboard) return;

    await navigator.clipboard.writeText(user.id);
    setCopiedUserId(true);
    window.setTimeout(() => setCopiedUserId(false), 1800);
  };

  const updatePreferences = async (nextPreferences) => {
    if (!canCustomizeAppearance) {
      const defaults = saveStoredPreferences(DEFAULT_PREFERENCES);
      setPreferences(defaults);
      setAppearanceMessage({
        type: "error",
        text: "Appearance customization requires a Plus or Family plan.",
      });
      return;
    }

    const normalized = saveStoredPreferences({
      ...preferences,
      ...nextPreferences,
    });

    setPreferences(normalized);
    setSavingPreferences(true);
    setAppearanceMessage(null);

    const result = await updateUserPreferencesAction(normalized);

    setSavingPreferences(false);

    if (result?.error) {
      setAppearanceMessage({
        type: "error",
        text: result.error,
      });
      return;
    }

    const saved = saveStoredPreferences(result?.data ?? normalized);
    setPreferences(saved);
    setAppearanceMessage({
      type: "success",
      text: "Appearance saved to your account.",
    });
  };

  const handleThemeChange = (keys) => {
    const themeId = Array.from(keys)[0];
    if (!themeId || themeId === preferences.themeId) return;
    updatePreferences({ themeId: String(themeId) });
  };

  const handleFontChange = (keys) => {
    const fontId = Array.from(keys)[0];
    if (!fontId || fontId === preferences.fontId) return;
    updatePreferences({ fontId: String(fontId) });
  };

  const handleCheckout = async (planId, interval) => {
    const loadingKey = `${planId}:${interval}`;
    setBillingLoading(loadingKey);
    setBillingError(null);

    const result = await createCheckoutSessionAction({ planId, interval });
    if (result?.url) {
      window.location.href = result.url;
      return;
    }

    setBillingError(result?.error || "Could not start checkout.");
    setBillingLoading(null);
  };

  const handleBillingPortal = async () => {
    setBillingLoading("portal");
    setBillingError(null);

    const result = await createBillingPortalSessionAction();
    if (result?.url) {
      window.location.href = result.url;
      return;
    }

    setBillingError(result?.error || "Could not open billing portal.");
    setBillingLoading(null);
  };

  const handleCreateInvite = async (event) => {
    event.preventDefault();
    setSharingLoading("invite");
    setSharingError(null);
    setSharingMessage(null);

    const result = await createHouseholdInviteAction(inviteEmail, inviteRole);
    setSharingLoading(null);

    if (result?.error) {
      setSharingMessage({ type: "error", text: result.error });
      return;
    }

    const invite = result?.data?.invite;
    if (invite) {
      setSharing((current) => ({
        ...current,
        invites: [invite, ...(current?.invites ?? [])],
      }));
      setInviteEmail("");
      setInviteRole("editor");
      const sentExistingUserLink = result?.data?.emailType === "magic_link";
      setSharingMessage({
        type: result?.data?.emailSent ? "success" : "error",
        text: result?.data?.emailSent
          ? sentExistingUserLink
            ? "Invite email sent as a login link because that email already has an account. They will land on the invite after signing in."
            : "Invite email sent. You can also copy the invite link below."
          : `Invite link created, but the email was not sent: ${result?.data?.emailError || "Unknown email error"}. Copy the invite link below and send it manually.`,
      });
    }
  };

  const handleCopyInvite = async (invite) => {
    if (!invite?.link || !navigator?.clipboard) return;

    await navigator.clipboard.writeText(invite.link);
    setCopiedInviteId(invite.id);
    window.setTimeout(() => setCopiedInviteId(null), 1800);
  };

  const handleRevokeInvite = async (inviteId) => {
    setSharingLoading(`revoke:${inviteId}`);
    setSharingMessage(null);

    const result = await revokeHouseholdInviteAction(inviteId);
    setSharingLoading(null);

    if (result?.error) {
      setSharingMessage({ type: "error", text: result.error });
      return;
    }

    setSharing((current) => ({
      ...current,
      invites: (current?.invites ?? []).filter((invite) => invite.id !== inviteId),
    }));
  };

  const handleRequestRemoveMember = (member) => {
    if (!member?.userId) return;
    setSharingMessage(null);
    setRemoveMemberCandidate(member);
  };

  const handleCancelRemoveMember = () => {
    if (sharingLoading?.startsWith("remove:")) return;
    setRemoveMemberCandidate(null);
  };

  const handleConfirmRemoveMember = async () => {
    const member = removeMemberCandidate;
    if (!member?.userId) return;

    setSharingLoading(`remove:${member.userId}`);
    setSharingMessage(null);

    const result = await removeHouseholdMemberAction(member.userId);
    setSharingLoading(null);
    setRemoveMemberCandidate(null);

    if (result?.error) {
      setSharingMessage({ type: "error", text: result.error });
      return;
    }

    setSharing((current) => {
      const nextMembers = (current?.members ?? []).filter(
        (item) => item.userId !== member.userId
      );
      const nextMemberCount = nextMembers.length;

      return {
        ...current,
        members: nextMembers,
        memberCount: nextMemberCount,
        canInvite:
          current?.currentUserRole === "owner" &&
          current?.effectivePlanId === "family" &&
          (current?.maxMembers === null || nextMemberCount < current?.maxMembers),
      };
    });

    setSharingMessage({
      type: "success",
      text: `${member.email} was removed from this household.`,
    });
  };

  const handleUpdateMemberRole = async (member, role) => {
    if (!member?.userId || !role || member.role === role) return;

    setSharingLoading(`role:${member.userId}`);
    setSharingMessage(null);

    const result = await updateHouseholdMemberRoleAction(member.userId, role);
    setSharingLoading(null);

    if (result?.error) {
      setSharingMessage({ type: "error", text: result.error });
      return;
    }

    const updatedMember = result?.data?.member;
    if (!updatedMember) return;

    setSharing((current) => ({
      ...current,
      members: (current?.members ?? []).map((item) =>
        item.userId === updatedMember.userId ? updatedMember : item
      ),
    }));

    setSharingMessage({
      type: "success",
      text: `${updatedMember.email} is now a ${formatHouseholdRole(updatedMember.role).toLowerCase()}.`,
    });
  };

  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.header
        variants={itemVariants}
        className="rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm max-md:hidden"
      >
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-stocksense-teal to-stocksense-sky text-lg font-semibold text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
              Profile
            </h1>
            <p className="mt-1 break-words text-sm text-gray-500">
              Manage your account security and WhereKeep preferences.
            </p>
          </div>
        </div>
      </motion.header>

      {requiresPasswordSetup && (
        <div className="max-md:hidden">
          <PasswordSetupNotice />
        </div>
      )}

      <div className="max-md:hidden">
        <BillingReturnNotice />
      </div>

      <div className="space-y-4 pb-24 md:hidden">
        <MobileProfileCard>
          <div className="flex items-start gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--stocksense-brand)] text-base font-semibold text-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-words text-base font-semibold text-gray-950">
                {user.email}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Current plan</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-gray-950">
                    {currentPlan.name}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-gray-950">
                    {accountStatus}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </MobileProfileCard>

        {requiresPasswordSetup && <PasswordSetupNotice />}
        <BillingReturnNotice />

        <MobileProfileCard>
          <MobileSectionHeader
            icon={FaPalette}
            title="Appearance"
            description={`${selectedTheme.label} theme with ${selectedFont.label} font.`}
          />

          <div className="mt-4 space-y-4">
            {!canCustomizeAppearance && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                Theme and font customization is included with Plus and Family.{" "}
                <Link
                  href="#mobile-billing"
                  onClick={handleMobileBillingLink}
                  className="font-semibold underline"
                >
                  View plans
                </Link>
              </div>
            )}

            <Select
              label="Color theme"
              selectedKeys={new Set([preferences.themeId])}
              onSelectionChange={handleThemeChange}
              isDisabled={savingPreferences || !canCustomizeAppearance}
              variant="bordered"
              radius="lg"
              startContent={<FaPalette className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />}
              classNames={themedSelectClassNames}
            >
              {THEME_OPTIONS.map((theme) => (
                <SelectItem key={theme.id} textValue={theme.label}>
                  {theme.label} - {theme.description}
                </SelectItem>
              ))}
            </Select>

            <Select
              label="Font family"
              selectedKeys={new Set([preferences.fontId])}
              onSelectionChange={handleFontChange}
              isDisabled={savingPreferences || !canCustomizeAppearance}
              variant="bordered"
              radius="lg"
              startContent={<FaFont className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />}
              classNames={themedSelectClassNames}
            >
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font.id} textValue={font.label}>
                  {font.label} - {font.description}
                </SelectItem>
              ))}
            </Select>

            <Button
              variant="flat"
              className="w-full rounded-xl border border-stocksense-gray bg-white text-gray-700"
              onPress={() => updatePreferences(DEFAULT_PREFERENCES)}
              isLoading={savingPreferences}
              isDisabled={savingPreferences || !canCustomizeAppearance}
              startContent={<FaRedo className="h-3.5 w-3.5" />}
            >
              Reset appearance
            </Button>

            {appearanceMessage && (
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  appearanceMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
                role={appearanceMessage.type === "success" ? "status" : "alert"}
              >
                {appearanceMessage.text}
              </div>
            )}
          </div>
        </MobileProfileCard>

        <MobileAccordionCard
          id="mobile-billing"
          icon={FaCreditCard}
          title="Billing"
          summary={`${currentPlan.name}${billing.status ? ` - ${billing.status}` : ""}`}
          isOpen={mobileBillingOpen}
          onOpenChange={setMobileBillingOpen}
        >
          <div className="space-y-3">
            {renewalDate && (
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  billing.cancelAtPeriodEnd
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-gray-200 bg-gray-50 text-gray-700"
                }`}
              >
                {billing.cancelAtPeriodEnd
                  ? `Access ends on ${renewalDate}.`
                  : `Renews on ${renewalDate}.`}
              </div>
            )}

            {billingError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {billingError}
              </div>
            )}

            <Button
              variant="flat"
              className="w-full rounded-xl border border-stocksense-gray bg-white text-gray-700"
              onPress={handleBillingPortal}
              isLoading={billingLoading === "portal"}
              isDisabled={billingLoading === "portal" || !billing.hasStripeCustomer}
              startContent={<FaExternalLinkAlt className="h-3.5 w-3.5" />}
            >
              {billing.hasStripeCustomer ? "Manage billing" : "Billing portal available after checkout"}
            </Button>

            <div className="grid gap-2">
              {paidPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-950">{plan.name}</p>
                      <p className="mt-0.5 text-xs leading-5 text-gray-500">
                        {plan.audience}
                      </p>
                    </div>
                    {effectivePlanId === plan.id ? (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Current
                      </span>
                    ) : null}
                  </div>
                  {effectivePlanId !== plan.id && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <BillingPlanButton
                        plan={plan}
                        interval={BILLING_INTERVALS.monthly}
                        currentPlanId={effectivePlanId}
                        onCheckout={handleCheckout}
                        isLoading={billingLoading === `${plan.id}:monthly`}
                      />
                      <BillingPlanButton
                        plan={plan}
                        interval={BILLING_INTERVALS.yearly}
                        currentPlanId={effectivePlanId}
                        onCheckout={handleCheckout}
                        isLoading={billingLoading === `${plan.id}:yearly`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </MobileAccordionCard>

        <MobileProfileCard>
          <MobileSectionHeader
            icon={FaUserFriends}
            title="Family sharing"
            description={
              sharing
                ? `${sharing.household?.name ?? "My Household"} - ${sharingMemberLimitLabel}`
                : "Household sharing settings"
            }
          />

          <div className="mt-4 space-y-4">
            {sharingError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {sharingError}
              </div>
            )}

            {sharing && (
              <>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                  <MobileInfoRow
                    label="Household"
                    value={sharing.household?.name ?? "My Household"}
                  />
                  <MobileInfoRow label="Members" value={sharingMemberLimitLabel} />
                  <MobileInfoRow
                    label="Your role"
                    value={formatHouseholdRole(sharing.currentUserRole)}
                  />
                </div>

                {!sharingIsFamily && sharingIsOwner && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                    Upgrade to Family to invite household members.{" "}
                    <Link
                      href="#mobile-billing"
                      onClick={handleMobileBillingLink}
                      className="font-semibold underline"
                    >
                      View Family plan
                    </Link>
                  </div>
                )}

                {sharingIsFamily && sharingIsOwner && (
                  <form onSubmit={handleCreateInvite} className="space-y-3">
                    <Input
                      label="Invite by email"
                      type="email"
                      value={inviteEmail}
                      onValueChange={setInviteEmail}
                      isDisabled={sharingLoading === "invite" || !sharing.canInvite}
                      classNames={{
                        inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
                      }}
                    />
                    <Select
                      label="Role"
                      selectedKeys={new Set([inviteRole])}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0];
                        if (value) setInviteRole(String(value));
                      }}
                      isDisabled={sharingLoading === "invite" || !sharing.canInvite}
                      variant="bordered"
                      radius="lg"
                      classNames={themedSelectClassNames}
                    >
                      {HOUSEHOLD_ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role.id} textValue={role.label}>
                          {role.label} - {role.description}
                        </SelectItem>
                      ))}
                    </Select>
                    <Button
                      type="submit"
                      className="h-12 w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
                      isLoading={sharingLoading === "invite"}
                      isDisabled={sharingLoading === "invite" || !sharing.canInvite}
                      startContent={<FaUserPlus className="h-3.5 w-3.5" />}
                    >
                      Send invite
                    </Button>
                  </form>
                )}

                {sharingMessage && (
                  <div
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      sharingMessage.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                    role={sharingMessage.type === "success" ? "status" : "alert"}
                  >
                    {sharingMessage.text}
                  </div>
                )}

                <MobileInlineAccordion title="Members">
                  <div className="space-y-2">
                    {sharingMembers.map((member) => (
                      <div
                        key={member.userId}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2"
                      >
                        <p className="truncate text-sm font-medium text-gray-900">
                          {member.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatHouseholdRole(member.role)}
                        </p>
                      </div>
                    ))}
                    {sharingInvites.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {sharingInvites.length} pending invite{sharingInvites.length === 1 ? "" : "s"}.
                      </p>
                    )}
                  </div>
                </MobileInlineAccordion>
              </>
            )}
          </div>
        </MobileProfileCard>

        <MobileProfileCard>
          <MobileSectionHeader
            icon={FaKey}
            title="Password & security"
            description="Change the password used for future logins."
          />

          <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4" noValidate>
            <AnimatePresence mode="popLayout">
              {error && (
                <StatusMessage key="mobile-error" type="error">
                  {error}
                </StatusMessage>
              )}
              {success && (
                <StatusMessage key="mobile-success" type="success">
                  {success}
                </StatusMessage>
              )}
            </AnimatePresence>

            <Input
              label="New password"
              type={showPassword ? "text" : "password"}
              value={password}
              onValueChange={setPassword}
              autoComplete="new-password"
              isInvalid={showPasswordError}
              errorMessage={showPasswordError ? "Use at least 6 characters." : undefined}
              endContent={
                <button
                  type="button"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-400"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                </button>
              }
              classNames={{
                inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
              }}
            />

            <Input
              label="Confirm password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onValueChange={setConfirmPassword}
              autoComplete="new-password"
              isInvalid={showConfirmError}
              errorMessage={showConfirmError ? "Passwords do not match." : undefined}
              classNames={{
                inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
              }}
            />

            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
              isLoading={savingPassword}
              isDisabled={savingPassword}
            >
              {savingPassword ? "Updating..." : "Update password"}
            </Button>
          </form>
        </MobileProfileCard>

        <MobileAccordionCard
          icon={FaUserCircle}
          title="Account details"
          summary={user.email}
        >
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3">
            <MobileInfoRow label="Email" value={user.email} />
            <MobileInfoRow
              label="Email status"
              value={user.emailConfirmed ? "Confirmed" : "Not confirmed"}
            />
            <MobileInfoRow label="Provider" value={user.provider} />
            <MobileInfoRow label="Role" value={user.role} />
            <MobileInfoRow label="Created" value={user.createdAtLabel} />
            <MobileInfoRow label="Last sign in" value={user.lastSignInLabel} />
          </div>
          {user.id && (
            <Button
              variant="flat"
              className="mt-3 w-full rounded-xl border border-stocksense-gray bg-white text-gray-700"
              onPress={handleCopyUserId}
              startContent={<FaClipboard />}
            >
              {copiedUserId ? "Copied user ID" : "Copy user ID"}
            </Button>
          )}
        </MobileAccordionCard>

        <MobileProfileCard>
          <MobileSectionHeader
            icon={FaShieldAlt}
            title="Legal and support"
            description="Terms, privacy, and billing settings."
          />
          <div className="mt-4 grid gap-2">
            <Link
              href="/terms"
              className="flex min-h-11 items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900"
            >
              Terms
              <FaExternalLinkAlt className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
            </Link>
            <Link
              href="/privacy"
              className="flex min-h-11 items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900"
            >
              Privacy
              <FaExternalLinkAlt className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
            </Link>
            <Link
              href="#mobile-billing"
              onClick={handleMobileBillingLink}
              className="flex min-h-11 items-center justify-between rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-3 text-sm font-semibold text-[var(--stocksense-brand)]"
            >
              Billing and plan settings
              <FaExternalLinkAlt className="h-3.5 w-3.5" />
            </Link>
          </div>
        </MobileProfileCard>
      </div>

      <div className="grid grid-cols-1 gap-6 max-md:hidden lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <div className="space-y-6">
          <BillingSection
            billing={billing}
            billingError={billingError}
            billingLoading={billingLoading}
            onCheckout={handleCheckout}
            onPortal={handleBillingPortal}
          />

          <SharingSection
            sharing={sharing}
            sharingError={sharingError}
            sharingMessage={sharingMessage}
            inviteEmail={inviteEmail}
            inviteRole={inviteRole}
            onInviteEmailChange={setInviteEmail}
            onInviteRoleChange={setInviteRole}
            onCreateInvite={handleCreateInvite}
            onCopyInvite={handleCopyInvite}
            onRevokeInvite={handleRevokeInvite}
            onRemoveMember={handleRequestRemoveMember}
            onUpdateMemberRole={handleUpdateMemberRole}
            copiedInviteId={copiedInviteId}
            loading={sharingLoading}
          />

          <motion.section
            id="change-password"
            variants={itemVariants}
            className="rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                <FaKey className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Change password</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Use a password that is hard to guess and different from your email password.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4" noValidate>
              <AnimatePresence mode="popLayout">
                {error && (
                  <StatusMessage key="error" type="error">
                    {error}
                  </StatusMessage>
                )}
                {success && (
                  <StatusMessage key="success" type="success">
                    {success}
                  </StatusMessage>
                )}
              </AnimatePresence>

              <Input
                label="New password"
                type={showPassword ? "text" : "password"}
                value={password}
                onValueChange={setPassword}
                autoComplete="new-password"
                isInvalid={showPasswordError}
                errorMessage={showPasswordError ? "Use at least 6 characters." : undefined}
                endContent={
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-[var(--stocksense-brand-soft)] hover:text-[var(--stocksense-brand)]"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <FaEyeSlash className="h-4 w-4" />
                    ) : (
                      <FaEye className="h-4 w-4" />
                    )}
                  </button>
                }
                classNames={{
                  inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
                }}
              />

              <Input
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                autoComplete="new-password"
                isInvalid={showConfirmError}
                errorMessage={showConfirmError ? "Passwords do not match." : undefined}
                classNames={{
                  inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
                }}
              />

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FaShieldAlt className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                  Password changes apply to future logins.
                </div>
                <Button
                  type="submit"
                  className="rounded-xl bg-[var(--stocksense-brand)] px-5 text-white"
                  isLoading={savingPassword}
                  isDisabled={savingPassword}
                >
                  {savingPassword ? "Updating..." : "Update password"}
                </Button>
              </div>
            </form>
          </motion.section>

          <motion.section
            variants={itemVariants}
            className="rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                <FaPalette className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Current style: {selectedTheme.label} with {selectedFont.label} font.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {!canCustomizeAppearance && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                  Theme and font customization is included with Plus and Family.{" "}
                  <Link href="#billing" className="font-semibold underline">
                    View plans
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Color theme"
                  selectedKeys={new Set([preferences.themeId])}
                  onSelectionChange={handleThemeChange}
                  isDisabled={savingPreferences || !canCustomizeAppearance}
                  variant="bordered"
                  radius="lg"
                  startContent={<FaPalette className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />}
                  classNames={themedSelectClassNames}
                >
                  {THEME_OPTIONS.map((theme) => (
                    <SelectItem key={theme.id} textValue={theme.label}>
                      {theme.label} - {theme.description}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="Font family"
                  selectedKeys={new Set([preferences.fontId])}
                  onSelectionChange={handleFontChange}
                  isDisabled={savingPreferences || !canCustomizeAppearance}
                  variant="bordered"
                  radius="lg"
                  startContent={<FaFont className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />}
                  classNames={themedSelectClassNames}
                >
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.id} textValue={font.label}>
                      {font.label} - {font.description}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <AppearancePreview theme={selectedTheme} font={selectedFont} />

              <Button
                variant="flat"
                className="rounded-xl border border-stocksense-gray bg-white text-gray-700"
                onPress={() => updatePreferences(DEFAULT_PREFERENCES)}
                isLoading={savingPreferences}
                isDisabled={savingPreferences || !canCustomizeAppearance}
                startContent={<FaRedo className="h-3.5 w-3.5" />}
              >
                Reset appearance
              </Button>

              {appearanceMessage && (
                <div
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    appearanceMessage.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                  role={appearanceMessage.type === "success" ? "status" : "alert"}
                >
                  {appearanceMessage.text}
                </div>
              )}
            </div>
          </motion.section>
        </div>

        <motion.aside
          variants={itemVariants}
          className="space-y-6"
        >
          <section className="rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                <FaUserCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Account details</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Basic details tied to this WhereKeep account.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <DetailRow icon={FaEnvelope} label="Email" value={user.email} />
              <DetailRow
                icon={FaCheckCircle}
                label="Email status"
                value={user.emailConfirmed ? "Confirmed" : "Not confirmed"}
              />
              <DetailRow icon={FaShieldAlt} label="Provider" value={user.provider} />
              <DetailRow icon={FaIdBadge} label="Role" value={user.role} />
              <DetailRow icon={FaUserCircle} label="Created" value={user.createdAtLabel} />
              <DetailRow icon={FaClock} label="Last sign in" value={user.lastSignInLabel} />
            </div>

            {user.id && (
              <Button
                variant="flat"
                className="mt-4 w-full rounded-xl border border-stocksense-gray bg-white text-gray-700"
                onPress={handleCopyUserId}
                startContent={<FaClipboard />}
              >
                {copiedUserId ? "Copied user ID" : "Copy user ID"}
              </Button>
            )}
          </section>

          <section className="rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-gray-900">Quick actions</h2>
              <p className="text-sm text-gray-500">
                Jump back into the inventory views you use most.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <ShortcutButton
                href="/items"
                icon={FaBoxOpen}
                label="Items"
                description="Search and manage inventory"
              />
              <ShortcutButton
                href="/locations"
                icon={FaMapMarkedAlt}
                label="Locations"
                description="Manage places and storage"
              />
              <ShortcutButton
                href="/areas"
                icon={FaWarehouse}
                label="Areas"
                description="Review storage areas"
              />
              <ShortcutButton
                href="/categories"
                icon={FaTags}
                label="Categories"
                description="Organize item groups"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                <FaShieldAlt className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Legal and support</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Review account terms, privacy details, and billing access.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <LegalResourceButton
                href="/terms"
                label="Terms of Service"
                description="Rules for accounts, household access, subscriptions, and acceptable use."
              />
              <LegalResourceButton
                href="/privacy"
                label="Privacy Policy"
                description="How account, inventory, photo, barcode, and billing data are handled."
              />
              <Link
                href="#billing"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--stocksense-brand)] transition hover:brightness-95"
              >
                Billing and plan settings
              </Link>
            </div>
          </section>
        </motion.aside>
      </div>

      <ConfirmDeleteModal
        isOpen={Boolean(removeMemberCandidate)}
        title="Remove household member?"
        description={
          removeMemberCandidate
            ? `${removeMemberCandidate.email} will lose access to this household's shared inventory, shopping list, and recent activity. Their account will not be deleted.`
            : ""
        }
        confirmLabel="Remove member"
        cancelLabel="Keep member"
        isDeleting={
          Boolean(removeMemberCandidate?.userId) &&
          sharingLoading === `remove:${removeMemberCandidate.userId}`
        }
        onConfirm={handleConfirmRemoveMember}
        onCancel={handleCancelRemoveMember}
      />
    </motion.div>
  );
}
