"use client";


import NativeButton from "@/components/ui/NativeButton";
import NativeInput from "@/components/ui/NativeInput";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/NativeModal";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useEffect,
  useMemo,
  useRef,
  useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence,
  motion } from "@/components/ui/MotionLite";
import {
  FaCheckCircle,
  FaChevronDown,
  FaChevronRight,
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
  FaPalette,
  FaRedo,
  FaShieldAlt,
  FaTimesCircle,
  FaUserCircle,
  FaUserFriends,
  FaUserPlus,
} from "react-icons/fa";
import { updatePasswordAction } from "@/app/actions/auth";
import {
  createBillingPortalSessionAction,
  createCheckoutSessionAction,
} from "@/app/actions/billing";
import {
  createHouseholdInviteAction,
  removeHouseholdMemberAction,
  resendHouseholdInviteAction,
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
import {
  updatePreferredNameAction,
  updateUserPreferencesAction,
} from "@/app/actions/preferences";
import NativeSelect from "@/components/ui/NativeSelect";

const ConfirmDeleteModal = dynamic(
  () => import("@/components/modals/ConfirmDeleteModal"),
  { ssr: false }
);

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
    description: "add, edit, delete",
  },
  {
    id: "viewer",
    label: "Viewer",
    description: "only view",
  },
];

function formatHouseholdRole(role) {
  if (role === "owner") return "Owner";
  if (role === "viewer") return "Viewer";
  return "Editor";
}

function getInitialsFromText(value, fallback = "WK") {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length > 1) {
    return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase();
  }

  if (words[0]) return words[0].slice(0, 2).toUpperCase();
  return fallback;
}

function DesktopBadge({ children, tone = "neutral", className = "" }) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "brand"
        ? "border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
        : tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-gray-200 bg-gray-50 text-gray-600";

  return (
    <span
      className={`inline-flex min-h-6 w-max shrink-0 items-center rounded-full border px-2.5 text-xs font-semibold ${toneClass} ${className}`}
    >
      {children}
    </span>
  );
}

function DesktopSectionHeader({ icon: Icon, title, description, action }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] ring-1 ring-[var(--stocksense-brand-border)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-gray-950">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-5 text-gray-500">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function DesktopInfoLine({ label, value, action }) {
  return (
    <div className="min-w-0 border-b border-gray-100 py-3 last:border-b-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <span className="shrink-0 text-sm text-gray-500">{label}</span>
        <span className="min-w-0 break-words text-right text-sm font-semibold text-gray-900">
          {value}
        </span>
      </div>
      {action ? <div className="mt-2 flex justify-end">{action}</div> : null}
    </div>
  );
}

function DesktopPreferenceSelect({
  label,
  options,
  value,
  disabled = false,
  onChange,
  type,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption =
    options.find((option) => option.id === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (containerRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const renderOptionMedia = (option, className = "") => {
    if (type === "theme") {
      return (
        <span
          className={`shrink-0 rounded-xl border border-black/5 shadow-sm ${className}`}
          style={{
            background: `linear-gradient(135deg, ${option.swatch}, ${option.border})`,
          }}
          aria-hidden="true"
        />
      );
    }

    return (
      <span
        className={`grid shrink-0 place-items-center rounded-xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] ring-1 ring-[var(--stocksense-brand-border)] ${className}`}
        style={{ fontFamily: option.family }}
        aria-hidden="true"
      >
        Aa
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <span className="mb-2 block text-sm font-semibold text-gray-950">
        {label}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-[76px] w-full items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm outline-none transition hover:border-[var(--stocksense-brand-border)] focus-visible:ring-2 focus-visible:ring-[var(--stocksense-brand-border)] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60"
      >
        <span className="flex min-w-0 items-center gap-3">
          {renderOptionMedia(selectedOption, "h-11 w-11 text-sm font-bold")}
          <span className="min-w-0">
            <span
              className="block truncate text-sm font-semibold text-gray-950"
              style={type === "font" ? { fontFamily: selectedOption.family } : undefined}
            >
              {selectedOption.label}
            </span>
            <span className="mt-0.5 block truncate text-xs text-gray-500">
              {selectedOption.description}
            </span>
          </span>
        </span>
        <FaChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-80 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-xl"
        >
          {options.map((option) => {
            const selected = option.id === value;

            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`flex min-h-[70px] w-full items-center gap-3 rounded-xl px-3 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--stocksense-brand-border)] ${
                  selected
                    ? "bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                    : "text-gray-800 hover:bg-gray-50"
                }`}
              >
                {renderOptionMedia(option, "h-10 w-10 text-sm font-bold")}
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="truncate text-sm font-semibold"
                      style={type === "font" ? { fontFamily: option.family } : undefined}
                    >
                      {option.label}
                    </span>
                    {selected ? (
                      <span className="shrink-0 rounded-full border border-[var(--stocksense-brand-border)] bg-white px-2 py-0.5 text-xs font-semibold text-[var(--stocksense-brand)]">
                        Selected
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
            You joined through an invite link. Create a password to finish securing your account.
          </p>
        </div>
      </div>
    </motion.div>
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

function DisplayNameForm({
  value,
  onValueChange,
  onSubmit,
  isSaving,
  message,
  submitLabel = "Save display name",
  className = "",
}) {
  return (
    <form onSubmit={onSubmit} className={`space-y-3 ${className}`}>
      <NativeInput
        label="Display name"
        value={value}
        onValueChange={onValueChange}
        autoComplete="name"
        placeholder="Add a display name"
        classNames={{
          inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
        }}
      />
      <NativeButton
        type="submit"
        className="h-11 w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
        isLoading={isSaving}
        isDisabled={isSaving}
        startContent={<FaIdBadge className="h-3.5 w-3.5" />}
      >
        {submitLabel}
      </NativeButton>
      {message && (
        <div
          className={`rounded-xl border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
          role={message.type === "success" ? "status" : "alert"}
        >
          {message.text}
        </div>
      )}
    </form>
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
    <NativeButton
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
    </NativeButton>
  );
}

function BillingSection({
  billing,
  billingError,
  billingLoading,
  className = "",
  onCheckout,
  onPortal,
}) {
  const currentPlanId = getEffectivePlanId(billing);
  const renewalDate = formatBillingDate(billing.currentPeriodEnd);
  const paidPlans = BILLING_PLANS.filter((plan) => plan.id !== "free");

  return (
    <motion.section
      id="billing"
      variants={itemVariants}
      className={`scroll-mt-6 rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm lg:rounded-[18px] lg:border-gray-200 lg:shadow-[0_18px_45px_rgba(15,23,42,0.06)] xl:p-6 ${className}`}
    >
      <DesktopSectionHeader
        icon={FaCreditCard}
        title="Billing"
        description="Plan, invoices, and Stripe billing settings."
      />

        {renewalDate && (
          <div
            className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
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
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {billingError}
          </div>
        )}

        <div className="mt-5 grid gap-3">
          {paidPlans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-gray-200 bg-white p-3"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-950">
                      {plan.name}
                    </h3>
                    {currentPlanId === plan.id ? (
                      <DesktopBadge tone="success">Current plan</DesktopBadge>
                    ) : plan.featured ? (
                      <DesktopBadge tone="brand">Popular</DesktopBadge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    {plan.audience}
                  </p>
                </div>
              </div>

              {currentPlanId !== plan.id ? (
                <div className="mt-3 grid grid-cols-1 gap-2 xl:grid-cols-2">
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
              ) : (
                <p className="mt-3 text-sm text-gray-600">
                  Use Manage billing for card, renewal, or cancellation changes.
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2 xl:flex-row">
          <NativeButton
            className="rounded-xl bg-[var(--stocksense-brand)] text-white xl:ml-auto"
            onPress={onPortal}
            isLoading={billingLoading === "portal"}
            isDisabled={billingLoading === "portal" || !billing.hasStripeCustomer}
            startContent={<FaExternalLinkAlt className="h-3.5 w-3.5" />}
          >
            {billing.hasStripeCustomer ? "Manage billing" : "Billing portal after checkout"}
          </NativeButton>
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
  className = "",
  currentUserId,
  onInviteEmailChange,
  onInviteRoleChange,
  onCreateInvite,
  onCopyInvite,
  onResendInvite,
  onRevokeInvite,
  onRemoveMember,
  onUpdateMemberRole,
  onClearSharingMessage,
  copiedInviteId,
  loading,
}) {
  const isFamily = sharing?.effectivePlanId === "family";
  const isOwner = sharing?.currentUserRole === "owner";
  const members = sharing?.members ?? [];
  const invites = sharing?.invites ?? [];
  const maxMembers = sharing?.maxMembers ?? null;
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const memberLimitLabel =
    maxMembers === null
      ? `${sharing?.memberCount ?? members.length} members`
      : `${sharing?.memberCount ?? members.length}/${maxMembers} members`;
  const householdName = sharing?.household?.name ?? "My Household";
  const handleInviteModalOpenChange = (open) => {
    if (!open) onClearSharingMessage?.();
    setIsInviteModalOpen(open);
  };
  const handleOpenInviteModal = () => {
    onClearSharingMessage?.();
    setIsInviteModalOpen(true);
  };

  return (
    <motion.section
      id="members"
      variants={itemVariants}
      className={`scroll-mt-6 rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm lg:rounded-[18px] lg:border-gray-200 lg:shadow-[0_18px_45px_rgba(15,23,42,0.06)] xl:col-span-2 xl:p-6 ${className}`}
    >
      <DesktopSectionHeader
        icon={FaUserFriends}
        title="Family sharing"
        description="Share one household inventory with clear roles and invitations."
        action={
          isFamily && isOwner ? (
            <button
              type="button"
              onClick={handleOpenInviteModal}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--stocksense-brand-border)]"
            >
              <FaUserPlus className="h-3.5 w-3.5" />
              Invite people
            </button>
          ) : null
        }
      />

        {sharingError && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {sharingError}
          </div>
        )}

        {sharing ? (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="min-w-0 truncate text-xl font-semibold text-gray-950">
                    {householdName}
                  </h3>
                  <DesktopBadge tone="brand">
                    {formatHouseholdRole(sharing.currentUserRole)}
                  </DesktopBadge>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {isFamily
                    ? `Family plan active with ${memberLimitLabel}.`
                    : "Family plan is required before inviting more household members."}
                </p>
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

            <div>
              <h3 className="text-sm font-semibold text-gray-950">Members</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                {members.map((member) => {
                  const memberName = member.displayName || member.email;
                  const isCurrentUser = member.userId === currentUserId;

                  return (
                    <div
                      key={member.userId}
                      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--stocksense-brand-soft)] text-sm font-semibold text-[var(--stocksense-brand)] ring-1 ring-[var(--stocksense-brand-border)]">
                          {getInitialsFromText(member.displayName || member.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <p className="min-w-0 truncate text-sm font-semibold text-gray-950">
                              {memberName}
                            </p>
                            {isCurrentUser ? (
                              <DesktopBadge tone="brand">You</DesktopBadge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {member.email}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <DesktopBadge
                              tone={member.role === "owner" ? "success" : "neutral"}
                            >
                              {formatHouseholdRole(member.role)}
                            </DesktopBadge>
                          </div>
                        </div>
                      </div>
                      {isOwner && member.role !== "owner" ? (
                        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                          <NativeSelect
                            aria-label={`Role for ${member.email}`}
                            value={member.role === "viewer" ? "viewer" : "editor"}
                            onChange={(value) => {
                              if (value) onUpdateMemberRole(member, String(value));
                            }}
                            disabled={loading === `role:${member.userId}`}
                            className="w-28"
                            triggerClassName="h-9 text-xs"
                            options={HOUSEHOLD_ROLE_OPTIONS.map((role) => ({
                              value: role.id,
                              label: role.label,
                            }))}
                          />
                          <NativeButton
                            size="sm"
                            variant="flat"
                            className="w-28 rounded-lg border border-rose-200 bg-rose-50 text-rose-700"
                            onPress={() => onRemoveMember(member)}
                            isLoading={loading === `remove:${member.userId}`}
                            startContent={<FaTimesCircle className="h-3.5 w-3.5" />}
                          >
                            Remove
                          </NativeButton>
                        </div>
                      ) : (
                        <FaCheckCircle className="h-4 w-4 shrink-0 text-[var(--stocksense-brand)]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {isOwner && invites.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-950">
                  Pending invites
                </h3>
                <div className="mt-3 space-y-3">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-950">
                            {invite.email}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatHouseholdRole(invite.role)} access - Expires{" "}
                            {formatBillingDate(invite.expiresAt) ?? "soon"}
                            {invite.status === "expired" ? " - Expired" : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <NativeButton
                            size="sm"
                            variant="flat"
                            className="rounded-lg border border-gray-200 bg-white text-gray-700"
                            onPress={() => onCopyInvite(invite)}
                            startContent={<FaCopy className="h-3.5 w-3.5" />}
                          >
                            {copiedInviteId === invite.id ? "Copied" : "Copy"}
                          </NativeButton>
                          <NativeButton
                            size="sm"
                            variant="flat"
                            className="rounded-lg border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]"
                            onPress={() => onResendInvite(invite.id)}
                            isLoading={loading === `resend:${invite.id}`}
                            startContent={<FaEnvelope className="h-3.5 w-3.5" />}
                          >
                            Resend
                          </NativeButton>
                          <NativeButton
                            size="sm"
                            variant="flat"
                            className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700"
                            onPress={() => onRevokeInvite(invite.id)}
                            isLoading={loading === `revoke:${invite.id}`}
                            startContent={<FaTimesCircle className="h-3.5 w-3.5" />}
                          >
                            Revoke
                          </NativeButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {isFamily && isOwner && sharing ? (
          <Modal
            isOpen={isInviteModalOpen}
            onOpenChange={handleInviteModalOpenChange}
            size="lg"
          >
            <ModalContent className="mx-4 w-full rounded-2xl bg-white shadow-2xl">
              {(close) => (
                <form onSubmit={onCreateInvite} noValidate>
                  <ModalHeader className="border-b border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] ring-1 ring-[var(--stocksense-brand-border)]">
                        <FaUserPlus className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-gray-950">
                          Invite people
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-gray-500">
                          Add someone to {householdName} with editor or viewer access.
                        </p>
                      </div>
                    </div>
                  </ModalHeader>
                  <ModalBody className="space-y-4 pt-5">
                    <NativeInput
                      label="Invite by email"
                      type="email"
                      value={inviteEmail}
                      onValueChange={onInviteEmailChange}
                      isDisabled={loading === "invite" || !sharing.canInvite}
                      classNames={{
                        inputWrapper: "rounded-xl border border-gray-200 shadow-none",
                      }}
                    />
                    <NativeSelect
                      label="Role"
                      aria-label="Invite role"
                      value={inviteRole}
                      onChange={(value) => {
                        if (value) onInviteRoleChange(String(value));
                      }}
                      disabled={loading === "invite" || !sharing.canInvite}
                      options={HOUSEHOLD_ROLE_OPTIONS.map((role) => ({
                        value: role.id,
                        label: `${role.label} - ${role.description}`,
                      }))}
                    />
                    {!sharing.canInvite && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        This household is at the Family member limit.
                      </p>
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
                  </ModalBody>
                  <ModalFooter className="flex justify-end gap-2 border-t border-gray-100">
                    <NativeButton
                      type="button"
                      variant="bordered"
                      className="rounded-xl border-gray-200 bg-white text-gray-700"
                      onPress={close}
                      isDisabled={loading === "invite"}
                    >
                      Cancel
                    </NativeButton>
                    <NativeButton
                      type="submit"
                      className="rounded-xl bg-[var(--stocksense-brand)] px-5 text-white"
                      isLoading={loading === "invite"}
                      isDisabled={loading === "invite" || !sharing.canInvite}
                      startContent={<FaUserPlus className="h-3.5 w-3.5" />}
                    >
                      Send invite
                    </NativeButton>
                  </ModalFooter>
                </form>
              )}
            </ModalContent>
          </Modal>
        ) : null}
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
  const [currentPassword, setCurrentPassword] = useState("");
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
  const [preferredName, setPreferredName] = useState(user?.displayName ?? "");
  const [savingPreferredName, setSavingPreferredName] = useState(false);
  const [preferredNameMessage, setPreferredNameMessage] = useState(null);
  const [isDisplayNameModalOpen, setIsDisplayNameModalOpen] = useState(false);
  const [mobileBillingOpen, setMobileBillingOpen] = useState(false);
  const mobileBillingScrollTimerRef = useRef(null);

  const currentPasswordRequired = !requiresPasswordSetup;
  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;
  const showCurrentPasswordError =
    submitted && currentPasswordRequired && !currentPassword.trim();
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
  const displayNameLabel = preferredName.trim() || "No display name set";

  const initials = useMemo(() => {
    const nameParts = preferredName.trim().split(/\s+/).filter(Boolean);
    const nameInitials =
      nameParts.length > 1
        ? `${nameParts[0][0] ?? ""}${nameParts[nameParts.length - 1][0] ?? ""}`
        : nameParts[0]?.slice(0, 2);

    if (nameInitials) return nameInitials.toUpperCase();

    const email = user?.email || "";
    return email.slice(0, 2).toUpperCase() || "WK";
  }, [preferredName, user?.email]);

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
    setPreferredName(user?.displayName ?? "");
  }, [user?.displayName]);

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

  const handleOpenDisplayNameModal = () => {
    setPreferredNameMessage(null);
    setIsDisplayNameModalOpen(true);
  };

  const handleDisplayNameModalOpenChange = (open) => {
    if (!open) setPreferredNameMessage(null);
    setIsDisplayNameModalOpen(open);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
    setSuccess(null);

    if (currentPasswordRequired && !currentPassword.trim()) {
      setError("Enter your current password.");
      return;
    }

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
      const result = await updatePasswordAction({
        currentPassword,
        password,
      });

      if (!result?.success) {
        setError(result?.error || "Could not update password.");
        return;
      }

      setCurrentPassword("");
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

  const handlePreferredNameSubmit = async (event) => {
    event.preventDefault();
    setSavingPreferredName(true);
    setPreferredNameMessage(null);

    try {
      const result = await updatePreferredNameAction(preferredName);
      const savedName = result?.data?.name ?? preferredName.trim();

      if (result?.error) {
        setPreferredNameMessage({
          type: "error",
          text: result.error,
        });
        return;
      }

      setPreferredName(savedName);
      setPreferredNameMessage({
        type: "success",
        text: savedName
          ? "Display name saved."
          : "Display name cleared.",
      });
      handleDisplayNameModalOpenChange(false);
    } catch (err) {
      setPreferredNameMessage({
        type: "error",
        text: err?.message || "Could not save display name.",
      });
    } finally {
      setSavingPreferredName(false);
    }
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

  const handleThemeChange = (value) => {
    const themeId = value;
    if (!themeId || themeId === preferences.themeId) return;
    updatePreferences({ themeId: String(themeId) });
  };

  const handleFontChange = (value) => {
    const fontId = value;
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

  const handleResendInvite = async (inviteId) => {
    setSharingLoading(`resend:${inviteId}`);
    setSharingMessage(null);

    const result = await resendHouseholdInviteAction(inviteId);
    setSharingLoading(null);

    if (result?.error) {
      setSharingMessage({ type: "error", text: result.error });
      return;
    }

    const invite = result?.data?.invite;
    if (invite) {
      setSharing((current) => ({
        ...current,
        invites: (current?.invites ?? []).map((existing) =>
          existing.id === invite.id ? invite : existing
        ),
      }));
      const sentExistingUserLink = result?.data?.emailType === "magic_link";
      setSharingMessage({
        type: result?.data?.emailSent ? "success" : "error",
        text: result?.data?.emailSent
          ? sentExistingUserLink
            ? "Invite resent as a login link because that email already has an account."
            : "Invite email resent."
          : `Invite was refreshed, but the email was not sent: ${result?.data?.emailError || "Unknown email error"}. Copy the invite link and send it manually.`,
      });
    }
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
        className="hidden rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm md:block lg:hidden"
      >
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-stocksense-teal to-stocksense-sky text-lg font-semibold text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
              Account Settings
            </h1>
            <p className="mt-1 break-words text-sm text-gray-500">
              Manage your household, billing, preferences, and account security.
            </p>
          </div>
        </div>
      </motion.header>

      <motion.div
        variants={itemVariants}
        className="mx-auto hidden max-w-[1280px] space-y-5 lg:block"
      >
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
            Profile
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Manage your account, preferences, and household.
          </p>
        </header>

        <section className="rounded-[18px] border border-gray-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] xl:p-6">
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[22px] bg-gradient-to-br from-[var(--stocksense-brand)] to-stocksense-sky text-2xl font-semibold text-white shadow-sm ring-4 ring-[var(--stocksense-brand-soft)]">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-gray-950">
                    {preferredName.trim() || user.email}
                  </h2>
                  <DesktopBadge tone={user.emailConfirmed ? "success" : "warning"}>
                    {accountStatus}
                  </DesktopBadge>
                </div>
                <p className="mt-1 break-words text-sm text-gray-500">
                  {preferredName.trim() ? user.email : "WhereKeep account"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <DesktopBadge tone="brand">WhereKeep account</DesktopBadge>
                  <DesktopBadge>Joined {user.createdAtLabel}</DesktopBadge>
                  <DesktopBadge>{currentPlan.name} plan</DesktopBadge>
                </div>
              </div>
            </div>

            <NativeButton
              variant="bordered"
              className="rounded-xl border-gray-200 bg-white text-gray-700"
              onPress={handleOpenDisplayNameModal}
              startContent={<FaIdBadge className="h-3.5 w-3.5" />}
            >
              Edit Display Name
            </NativeButton>
          </div>
        </section>
      </motion.div>

      {requiresPasswordSetup && (
        <div className="hidden lg:mx-auto lg:block lg:max-w-[1280px]">
          <PasswordSetupNotice />
        </div>
      )}

      <div className="hidden lg:mx-auto lg:block lg:max-w-[1280px]">
        <BillingReturnNotice />
      </div>

      <div className="space-y-4 pb-24 lg:hidden">
        <MobileProfileCard>
          <div className="flex items-start gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--stocksense-brand)] text-base font-semibold text-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-words text-base font-semibold text-gray-950">
                {preferredName.trim() || user.email}
              </p>
              {preferredName.trim() ? (
                <p className="mt-0.5 break-words text-sm text-gray-500">
                  {user.email}
                </p>
              ) : null}
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
          <DisplayNameForm
            value={preferredName}
            onValueChange={setPreferredName}
            onSubmit={handlePreferredNameSubmit}
            isSaving={savingPreferredName}
            message={preferredNameMessage}
            className="mt-4 border-t border-gray-100 pt-4"
          />
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

            <NativeSelect
              label={
                <span className="inline-flex items-center gap-1.5">
                  <FaPalette className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                  Color theme
                </span>
              }
              aria-label="Color theme"
              value={preferences.themeId}
              onChange={handleThemeChange}
              disabled={savingPreferences || !canCustomizeAppearance}
              options={THEME_OPTIONS.map((theme) => ({
                value: theme.id,
                label: `${theme.label} - ${theme.description}`,
              }))}
            />

            <NativeSelect
              label={
                <span className="inline-flex items-center gap-1.5">
                  <FaFont className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                  Font family
                </span>
              }
              aria-label="Font family"
              value={preferences.fontId}
              onChange={handleFontChange}
              disabled={savingPreferences || !canCustomizeAppearance}
              options={FONT_OPTIONS.map((font) => ({
                value: font.id,
                label: `${font.label} - ${font.description}`,
              }))}
            />

            <NativeButton
              variant="flat"
              className="w-full rounded-xl border border-stocksense-gray bg-white text-gray-700"
              onPress={() => updatePreferences(DEFAULT_PREFERENCES)}
              isLoading={savingPreferences}
              isDisabled={savingPreferences || !canCustomizeAppearance}
              startContent={<FaRedo className="h-3.5 w-3.5" />}
            >
              Reset appearance
            </NativeButton>

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

            <NativeButton
              variant="flat"
              className="w-full rounded-xl border border-stocksense-gray bg-white text-gray-700"
              onPress={handleBillingPortal}
              isLoading={billingLoading === "portal"}
              isDisabled={billingLoading === "portal" || !billing.hasStripeCustomer}
              startContent={<FaExternalLinkAlt className="h-3.5 w-3.5" />}
            >
              {billing.hasStripeCustomer ? "Manage billing" : "Billing portal available after checkout"}
            </NativeButton>

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
                    <NativeInput
                      label="Invite by email"
                      type="email"
                      value={inviteEmail}
                      onValueChange={setInviteEmail}
                      isDisabled={sharingLoading === "invite" || !sharing.canInvite}
                      classNames={{
                        inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
                      }}
                    />
                    <NativeSelect
                      label="Role"
                      aria-label="Invite role"
                      value={inviteRole}
                      onChange={(value) => {
                        if (value) setInviteRole(String(value));
                      }}
                      disabled={sharingLoading === "invite" || !sharing.canInvite}
                      options={HOUSEHOLD_ROLE_OPTIONS.map((role) => ({
                        value: role.id,
                        label: `${role.label} - ${role.description}`,
                      }))}
                    />
                    <NativeButton
                      type="submit"
                      className="h-12 w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
                      isLoading={sharingLoading === "invite"}
                      isDisabled={sharingLoading === "invite" || !sharing.canInvite}
                      startContent={<FaUserPlus className="h-3.5 w-3.5" />}
                    >
                      Send invite
                    </NativeButton>
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
                  </div>
                </MobileInlineAccordion>

                {sharingIsOwner && sharingInvites.length > 0 && (
                  <MobileInlineAccordion
                    title={`Pending invites (${sharingInvites.length})`}
                  >
                    <div className="space-y-2">
                      {sharingInvites.map((invite) => (
                        <div
                          key={invite.id}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {invite.email}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {formatHouseholdRole(invite.role)} access - Expires{" "}
                              {formatBillingDate(invite.expiresAt) ?? "soon"}
                              {invite.status === "expired" ? " - Expired" : ""}
                            </p>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <NativeButton
                              size="sm"
                              variant="flat"
                              className="rounded-lg border border-stocksense-gray bg-white px-2 text-gray-700"
                              onPress={() => handleCopyInvite(invite)}
                              startContent={<FaCopy className="h-3.5 w-3.5" />}
                            >
                              {copiedInviteId === invite.id ? "Copied" : "Copy"}
                            </NativeButton>
                            <NativeButton
                              size="sm"
                              variant="flat"
                              className="rounded-lg border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-2 text-[var(--stocksense-brand)]"
                              onPress={() => handleResendInvite(invite.id)}
                              isLoading={sharingLoading === `resend:${invite.id}`}
                              startContent={<FaEnvelope className="h-3.5 w-3.5" />}
                            >
                              Resend
                            </NativeButton>
                            <NativeButton
                              size="sm"
                              variant="flat"
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2 text-rose-700"
                              onPress={() => handleRevokeInvite(invite.id)}
                              isLoading={sharingLoading === `revoke:${invite.id}`}
                              startContent={<FaTimesCircle className="h-3.5 w-3.5" />}
                            >
                              Revoke
                            </NativeButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </MobileInlineAccordion>
                )}
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

            {currentPasswordRequired && (
              <NativeInput
                label="Current password"
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onValueChange={setCurrentPassword}
                autoComplete="current-password"
                isInvalid={showCurrentPasswordError}
                errorMessage={
                  showCurrentPasswordError ? "Enter your current password." : undefined
                }
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
            )}

            <NativeInput
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

            <NativeInput
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

            <NativeButton
              type="submit"
              className="h-12 w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
              isLoading={savingPassword}
              isDisabled={savingPassword}
            >
              {savingPassword ? "Updating..." : "Update password"}
            </NativeButton>
          </form>
        </MobileProfileCard>

        <MobileAccordionCard
          icon={FaUserCircle}
          title="Account details"
          summary={user.email}
        >
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3">
            <MobileInfoRow label="Display name" value={displayNameLabel} />
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
            <NativeButton
              variant="flat"
              className="mt-3 w-full rounded-xl border border-stocksense-gray bg-white text-gray-700"
              onPress={handleCopyUserId}
              startContent={<FaClipboard />}
            >
              {copiedUserId ? "Copied user ID" : "Copy user ID"}
            </NativeButton>
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

      <div className="hidden grid-cols-1 gap-6 lg:mx-auto lg:grid lg:max-w-[1280px] lg:gap-5 xl:grid-cols-2 xl:gap-6">
        <BillingSection
          billing={billing}
          billingError={billingError}
          billingLoading={billingLoading}
          className="lg:order-1"
          onCheckout={handleCheckout}
          onPortal={handleBillingPortal}
        />

        <SharingSection
          sharing={sharing}
          sharingError={sharingError}
          sharingMessage={sharingMessage}
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          className="lg:order-3"
          currentUserId={user.id}
          onInviteEmailChange={setInviteEmail}
          onInviteRoleChange={setInviteRole}
          onCreateInvite={handleCreateInvite}
          onCopyInvite={handleCopyInvite}
          onResendInvite={handleResendInvite}
          onRevokeInvite={handleRevokeInvite}
          onRemoveMember={handleRequestRemoveMember}
          onUpdateMemberRole={handleUpdateMemberRole}
          onClearSharingMessage={() => setSharingMessage(null)}
          copiedInviteId={copiedInviteId}
          loading={sharingLoading}
        />

        <motion.section
          id="security"
          variants={itemVariants}
          className="scroll-mt-6 rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm lg:order-4 lg:rounded-[18px] lg:border-gray-200 lg:shadow-[0_18px_45px_rgba(15,23,42,0.06)] xl:p-6"
        >
          <DesktopSectionHeader
            icon={FaKey}
            title="Change password"
            description="Use a password that is hard to guess and different from your email password."
          />
          <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4" noValidate>
              <AnimatePresence mode="popLayout">
                {error && (
                  <StatusMessage key="desktop-error" type="error">
                    {error}
                  </StatusMessage>
                )}
                {success && (
                  <StatusMessage key="desktop-success" type="success">
                    {success}
                  </StatusMessage>
                )}
              </AnimatePresence>

              {currentPasswordRequired && (
                <NativeInput
                  label="Current password"
                  type={showPassword ? "text" : "password"}
                  value={currentPassword}
                  onValueChange={setCurrentPassword}
                  autoComplete="current-password"
                  isInvalid={showCurrentPasswordError}
                  errorMessage={
                    showCurrentPasswordError ? "Enter your current password." : undefined
                  }
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
                    inputWrapper: "rounded-xl border border-gray-200 shadow-none",
                  }}
                />
              )}

              <NativeInput
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
                  inputWrapper: "rounded-xl border border-gray-200 shadow-none",
                }}
              />
              <NativeInput
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                autoComplete="new-password"
                isInvalid={showConfirmError}
                errorMessage={showConfirmError ? "Passwords do not match." : undefined}
                classNames={{
                  inputWrapper: "rounded-xl border border-gray-200 shadow-none",
                }}
              />
              <div className="flex flex-col gap-3 pt-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FaShieldAlt className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                  Password changes apply to future logins.
                </div>
                <NativeButton
                  type="submit"
                  className="rounded-xl bg-[var(--stocksense-brand)] px-5 text-white"
                  isLoading={savingPassword}
                  isDisabled={savingPassword}
                >
                  {savingPassword ? "Updating..." : "Update password"}
                </NativeButton>
              </div>
          </form>
        </motion.section>

        <motion.section
          id="preferences"
          variants={itemVariants}
          className="scroll-mt-6 rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm lg:order-6 lg:rounded-[18px] lg:border-gray-200 lg:shadow-[0_18px_45px_rgba(15,23,42,0.06)] xl:p-6"
        >
          <DesktopSectionHeader
            icon={FaPalette}
            title="Appearance"
            description={`Current style: ${selectedTheme.label} with ${selectedFont.label} font.`}
          />
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
                <DesktopPreferenceSelect
                  label="Color theme"
                  type="theme"
                  options={THEME_OPTIONS}
                  value={preferences.themeId}
                  disabled={savingPreferences || !canCustomizeAppearance}
                  onChange={handleThemeChange}
                />
                <DesktopPreferenceSelect
                  label="Font family"
                  type="font"
                  options={FONT_OPTIONS}
                  value={preferences.fontId}
                  disabled={savingPreferences || !canCustomizeAppearance}
                  onChange={handleFontChange}
                />
              </div>

              <AppearancePreview theme={selectedTheme} font={selectedFont} />
              <NativeButton
                variant="bordered"
                className="rounded-xl border-gray-200 bg-white text-gray-700"
                onPress={() => updatePreferences(DEFAULT_PREFERENCES)}
                isLoading={savingPreferences}
                isDisabled={savingPreferences || !canCustomizeAppearance}
                startContent={<FaRedo className="h-3.5 w-3.5" />}
              >
                Reset appearance
              </NativeButton>
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

        <motion.section
          id="account"
          variants={itemVariants}
          className="scroll-mt-6 rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm lg:order-2 lg:rounded-[18px] lg:border-gray-200 lg:shadow-[0_18px_45px_rgba(15,23,42,0.06)] xl:p-6"
        >
          <DesktopSectionHeader
            icon={FaUserCircle}
            title="Account details"
            description="Basic details tied to this WhereKeep account."
          />
          <div className="mt-5 space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 px-4">
                <DesktopInfoLine label="Display name" value={displayNameLabel} />
                <DesktopInfoLine label="Email" value={user.email} />
                <DesktopInfoLine
                  label="Role"
                  value={
                    sharing?.currentUserRole
                      ? formatHouseholdRole(sharing.currentUserRole)
                      : user.role
                  }
                />
                <DesktopInfoLine label="Created" value={user.createdAtLabel} />
                <DesktopInfoLine label="Last sign in" value={user.lastSignInLabel} />
                {user.id ? (
                  <DesktopInfoLine
                    label="User ID"
                    value={
                      <span className="block max-w-full truncate font-mono text-xs">
                        {user.id}
                      </span>
                    }
                    action={
                      <NativeButton
                        size="sm"
                        variant="bordered"
                        className="rounded-lg border-gray-200 bg-white text-gray-700"
                        onPress={handleCopyUserId}
                        startContent={<FaClipboard className="h-3.5 w-3.5" />}
                      >
                        {copiedUserId ? "Copied" : "Copy ID"}
                      </NativeButton>
                    }
                  />
                ) : null}
              </div>
          </div>
        </motion.section>

        <motion.section
          id="support"
          variants={itemVariants}
          className="scroll-mt-6 rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm lg:order-7 lg:rounded-[18px] lg:border-gray-200 lg:shadow-[0_18px_45px_rgba(15,23,42,0.06)] xl:col-span-2 xl:p-6"
        >
          <DesktopSectionHeader
            icon={FaShieldAlt}
            title="Legal and support"
            description="Terms, privacy, billing, and support access."
          />
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {[
                {
                  href: "/terms",
                  label: "Terms of Service",
                  description: "Rules for accounts, household access, subscriptions, and acceptable use.",
                },
                {
                  href: "/privacy",
                  label: "Privacy Policy",
                  description: "How account, inventory, photo, barcode, and billing data are handled.",
                },
                {
                  href: "#billing",
                  label: "Billing and plan settings",
                  description: "Review your current plan or open Stripe billing when available.",
                },
                {
                  href: "/support",
                  label: "Contact support",
                  description: "Open WhereKeep support resources and account help.",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none transition hover:border-[var(--stocksense-brand-border)] hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[var(--stocksense-brand-border)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-950">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-sm leading-5 text-gray-500">
                      {item.description}
                    </span>
                  </span>
                  <FaChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400 transition group-hover:text-[var(--stocksense-brand)]" />
                </Link>
              ))}
          </div>
        </motion.section>
      </div>

      <Modal
        isOpen={isDisplayNameModalOpen}
        onOpenChange={handleDisplayNameModalOpenChange}
        size="md"
      >
        <ModalContent className="mx-4 w-full rounded-2xl bg-white shadow-2xl">
          <ModalHeader className="border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] ring-1 ring-[var(--stocksense-brand-border)]">
                <FaIdBadge className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-950">
                  Edit display name
                </h2>
                <p className="mt-1 text-sm leading-5 text-gray-500">
                  This name appears on your WhereKeep profile and household member list.
                </p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="pt-5">
            <DisplayNameForm
              value={preferredName}
              onValueChange={setPreferredName}
              onSubmit={handlePreferredNameSubmit}
              isSaving={savingPreferredName}
              message={preferredNameMessage}
              submitLabel="Save display name"
            />
          </ModalBody>
        </ModalContent>
      </Modal>

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
