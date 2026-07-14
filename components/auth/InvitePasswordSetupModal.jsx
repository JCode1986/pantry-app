"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { FaCheckCircle, FaEye, FaEyeSlash, FaKey } from "react-icons/fa";
import { updatePasswordAction } from "@/app/actions/auth";

function shouldSkipPasswordSetup(pathname) {
  return (
    pathname === "/invite" ||
    pathname?.startsWith("/invite/") ||
    pathname === "/magic-link-sync" ||
    pathname?.startsWith("/magic-link-sync/")
  );
}

export default function InvitePasswordSetupModal({ requiresPasswordSetup }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;
  const showPasswordError = submitted && !passwordValid;
  const showConfirmError = submitted && passwordValid && !passwordsMatch;

  useEffect(() => {
    if (!requiresPasswordSetup || shouldSkipPasswordSetup(pathname)) {
      setIsOpen(false);
      return undefined;
    }

    let frameId;
    const timerId = window.setTimeout(() => {
      frameId = window.requestAnimationFrame(() => setIsOpen(true));
    }, 350);

    return () => {
      window.clearTimeout(timerId);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [pathname, requiresPasswordSetup]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setError(null);

    if (!passwordValid) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const result = await updatePasswordAction({ password });

      if (!result?.success) {
        setError(result?.error || "Could not save password.");
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err?.message || "Could not save password.");
    } finally {
      setSaving(false);
    }
  };

  if (!requiresPasswordSetup) return null;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={() => {}}
      isDismissable={false}
      isKeyboardDismissDisabled
      hideCloseButton
      backdrop="opaque"
      placement="center"
      className="max-w-md"
      classNames={{
        wrapper: "z-[120] max-md:items-end",
        backdrop: "bg-slate-900/45",
        base: "max-md:m-0 max-md:w-screen max-md:max-w-none max-md:rounded-b-none max-md:rounded-t-2xl",
      }}
    >
      <ModalContent className="border border-gray-200 bg-white text-gray-800 shadow-2xl max-md:rounded-b-none max-md:rounded-t-2xl">
        <form onSubmit={handleSubmit} noValidate>
          <ModalHeader className="flex items-center gap-3 border-b border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-gray-950">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[var(--stocksense-brand)] shadow-sm">
              <FaKey className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold">Create your password</span>
              <span className="block text-sm font-normal text-gray-600">
                Finish securing your WhereKeep account.
              </span>
            </span>
          </ModalHeader>
          <ModalBody className="space-y-4 px-5 py-4">
            <p className="text-sm leading-5 text-gray-600">
              Your dashboard is ready. Create a password now so you can sign in with this account later.
            </p>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

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
          </ModalBody>
          <ModalFooter className="border-t border-gray-200 px-5 py-4">
            <Button
              type="submit"
              className="min-h-11 w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
              isLoading={saving}
              isDisabled={saving}
              startContent={!saving ? <FaCheckCircle className="h-4 w-4" /> : null}
            >
              Save password
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
