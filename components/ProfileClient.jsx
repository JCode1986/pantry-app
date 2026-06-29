"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import {
  FaBoxOpen,
  FaCheckCircle,
  FaClock,
  FaClipboard,
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
  FaUserCircle,
  FaWarehouse,
} from "react-icons/fa";
import { updatePasswordAction } from "@/app/actions/auth";
import {
  createBillingPortalSessionAction,
  createCheckoutSessionAction,
} from "@/app/actions/billing";
import {
  BILLING_INTERVALS,
  BILLING_PLANS,
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
  const currentPlan = getBillingPlan(billing.planId);
  const renewalDate = formatBillingDate(billing.currentPeriodEnd);
  const paidPlans = BILLING_PLANS.filter((plan) => plan.id !== "free");

  return (
    <motion.section
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
          {renewalDate && (
            <p className="mt-1 text-xs text-gray-500">
              {billing.cancelAtPeriodEnd ? "Access ends" : "Renews"} on {renewalDate}.
            </p>
          )}
        </div>
      </div>

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
              {plan.featured && (
                <span className="w-max rounded-full bg-[var(--stocksense-brand-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--stocksense-brand)]">
                  Popular
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <BillingPlanButton
                plan={plan}
                interval={BILLING_INTERVALS.monthly}
                currentPlanId={billing.planId}
                onCheckout={onCheckout}
                isLoading={billingLoading === `${plan.id}:monthly`}
              />
              <BillingPlanButton
                plan={plan}
                interval={BILLING_INTERVALS.yearly}
                currentPlanId={billing.planId}
                onCheckout={onCheckout}
                isLoading={billingLoading === `${plan.id}:yearly`}
              />
            </div>
          </div>
        ))}

        <Button
          variant="flat"
          className="w-full rounded-xl border border-stocksense-gray bg-white text-gray-700"
          onPress={onPortal}
          isLoading={billingLoading === "portal"}
          isDisabled={billingLoading === "portal"}
          startContent={<FaExternalLinkAlt className="h-3.5 w-3.5" />}
        >
          Manage billing
        </Button>
      </div>
    </motion.section>
  );
}

export default function ProfileClient({
  user,
  initialPreferences = DEFAULT_PREFERENCES,
  initialBilling = {
    planId: "free",
    status: "free",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  },
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [appearanceMessage, setAppearanceMessage] = useState(null);
  const [billing, setBilling] = useState(initialBilling);
  const [billingLoading, setBillingLoading] = useState(null);
  const [billingError, setBillingError] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;
  const showPasswordError = submitted && !passwordValid;
  const showConfirmError = submitted && passwordValid && !passwordsMatch;
  const selectedTheme = getThemeById(preferences.themeId);
  const selectedFont = getFontById(preferences.fontId);

  const initials = useMemo(() => {
    const email = user?.email || "";
    return email.slice(0, 2).toUpperCase() || "SS";
  }, [user?.email]);

  useEffect(() => {
    setPreferences(saveStoredPreferences(initialPreferences));
  }, [initialPreferences]);

  useEffect(() => {
    setBilling(initialBilling);
  }, [initialBilling]);

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

  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.header
        variants={itemVariants}
        className="rounded-2xl border border-stocksense-gray bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-stocksense-teal to-stocksense-sky text-lg font-semibold text-white shadow-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-stocksense-teal">
              Profile
            </h1>
            <p className="mt-1 break-words text-sm text-gray-500">
              Manage your account security and StockSense preferences.
            </p>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <div className="space-y-6">
          <BillingSection
            billing={billing}
            billingError={billingError}
            billingLoading={billingLoading}
            onCheckout={handleCheckout}
            onPortal={handleBillingPortal}
          />

          <motion.section
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Color theme"
                  selectedKeys={new Set([preferences.themeId])}
                  onSelectionChange={handleThemeChange}
                  isDisabled={savingPreferences}
                  variant="bordered"
                  radius="lg"
                  startContent={<FaPalette className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />}
                  classNames={{
                    trigger: "border-stocksense-gray",
                  }}
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
                  isDisabled={savingPreferences}
                  variant="bordered"
                  radius="lg"
                  startContent={<FaFont className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />}
                  classNames={{
                    trigger: "border-stocksense-gray",
                  }}
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
                  Basic details tied to this StockSense account.
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
        </motion.aside>
      </div>
    </motion.div>
  );
}
