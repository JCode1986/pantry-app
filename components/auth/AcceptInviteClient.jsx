"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { motion } from "framer-motion";
import { FaCheckCircle, FaEnvelopeOpenText, FaSignInAlt, FaUserFriends } from "react-icons/fa";
import { acceptHouseholdInviteAction } from "@/app/actions/household";

function formatInviteRole(role) {
  return role === "viewer" ? "Viewer" : "Editor";
}

export default function AcceptInviteClient({
  token,
  preview,
  previewError,
  isAuthenticated,
  userEmail,
}) {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(false);
  const [mergePrompt, setMergePrompt] = useState(null);
  const [error, setError] = useState(previewError ?? null);

  const handleAccept = async ({ mergeExistingData = false } = {}) => {
    setLoading(true);
    setError(null);

    const result = await acceptHouseholdInviteAction(token, { mergeExistingData });
    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    if (result?.data?.requiresMerge) {
      setMergePrompt(result.data);
      return;
    }

    setRequiresPasswordSetup(Boolean(result?.data?.requiresPasswordSetup));
    setMergePrompt(null);
    setAccepted(true);
  };

  return (
    <>
    <main className="page-enter fixed inset-0 z-[90] flex min-h-[100svh] items-center justify-center overflow-y-auto bg-gradient-to-br from-stocksense-teal/10 via-stocksense-sky/10 to-stocksense-lime/10 px-4 py-10">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-stocksense-gray bg-white shadow-lg"
      >
        <div className="bg-gradient-to-r from-stocksense-teal to-stocksense-sky px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
              <FaUserFriends className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Join household</h1>
              <p className="text-sm text-white/80">
                Accept the invite to share WhereKeep inventory.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          {accepted ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                <div className="flex items-center gap-2 font-semibold">
                  <FaCheckCircle className="h-4 w-4 text-[var(--stocksense-brand)]" />
                  You joined {preview?.householdName ?? "this household"}.
                </div>
                <p className="mt-1">
                  Shared locations, areas, categories, and items are now available in your account.
                </p>
              </div>

              {requiresPasswordSetup ? (
                <Button
                  as={Link}
                  href="/profile#change-password"
                  className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
                >
                  Set password
                </Button>
              ) : (
                <Button
                  as={Link}
                  href="/"
                  className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
                >
                  Continue
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-stocksense-gray bg-gray-50/60 px-3 py-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[var(--stocksense-brand)] shadow-sm">
                    <FaEnvelopeOpenText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">
                      {preview?.householdName ?? "Household invite"}
                    </div>
                    <div className="mt-1 break-words text-sm text-gray-500">
                      Invited email: {preview?.email ?? "Unknown"}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      Access role: {formatInviteRole(preview?.role)}
                    </div>
                    {userEmail && (
                      <div className="mt-1 break-words text-xs text-gray-400">
                        Signed in as {userEmail}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isAuthenticated ? (
                <Button
                  className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
                  onPress={() => handleAccept()}
                  isLoading={loading}
                  isDisabled={loading || Boolean(previewError)}
                  startContent={<FaCheckCircle className="h-4 w-4" />}
                >
                  Accept invite
                </Button>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    as={Link}
                    href={`/signup?redirectTo=/invite/${token}`}
                    className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
                    startContent={<FaUserFriends className="h-4 w-4" />}
                  >
                    Create account
                  </Button>
                  <Button
                    as={Link}
                    href={`/login?redirectTo=/invite/${token}`}
                    className="w-full rounded-xl border border-gray-200 bg-white text-gray-700"
                    startContent={<FaSignInAlt className="h-4 w-4" />}
                  >
                    Log in
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.section>
    </main>
    <Modal
      isOpen={Boolean(mergePrompt)}
      onOpenChange={() => {}}
      isDismissable={false}
      hideCloseButton
      backdrop="blur"
      placement="center"
      className="max-w-md"
      classNames={{
        wrapper: "z-[100] max-md:items-end",
        base: "max-md:m-0 max-md:w-screen max-md:max-w-none max-md:rounded-b-none max-md:rounded-t-2xl",
      }}
    >
      <ModalContent className="border border-gray-200 bg-white text-gray-800 shadow-2xl max-md:rounded-b-none max-md:rounded-t-2xl">
        <ModalHeader className="border-b border-amber-200 bg-amber-50 text-gray-950">
          Existing inventory found
        </ModalHeader>
        <ModalBody className="space-y-3 px-5 py-4 text-sm leading-5 text-amber-900">
          <p>
            This account already has saved inventory. To join{" "}
            {mergePrompt?.householdName ?? preview?.householdName ?? "this Family household"}{" "}
            with this account, you need to merge your existing data into the household.
          </p>
          <p>
            If you do not want to merge your data, cancel and delete your existing inventory first, or join with a different email.
          </p>
          {mergePrompt?.role === "viewer" ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              You are being invited as a Viewer. After merging, you will be able to view the merged data, but you will not be able to edit it unless the owner changes your role to Editor.
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter className="flex flex-col-reverse gap-2 border-t border-gray-200 px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            className="min-h-11 rounded-xl border border-gray-200 bg-white text-gray-700"
            onPress={() => setMergePrompt(null)}
            isDisabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="min-h-11 rounded-xl bg-[var(--stocksense-brand)] text-white"
            onPress={() => handleAccept({ mergeExistingData: true })}
            isLoading={loading}
            isDisabled={loading}
            startContent={!loading ? <FaCheckCircle className="h-4 w-4" /> : null}
          >
            Join and merge data
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </>
  );
}
