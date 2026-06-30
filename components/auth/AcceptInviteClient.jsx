"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import { FaCheckCircle, FaEnvelopeOpenText, FaSignInAlt, FaUserFriends } from "react-icons/fa";
import { acceptHouseholdInviteAction } from "@/app/actions/household";

export default function AcceptInviteClient({
  token,
  preview,
  previewError,
  isAuthenticated,
  userEmail,
}) {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(previewError ?? null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    const result = await acceptHouseholdInviteAction(token);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setAccepted(true);
  };

  return (
    <main className="page-enter flex min-h-[100vh] items-center justify-center px-4 py-10">
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

              <Button
                as={Link}
                href="/profile#change-password"
                className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
              >
                Set password
              </Button>
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
                  onPress={handleAccept}
                  isLoading={loading}
                  isDisabled={loading || Boolean(previewError)}
                  startContent={<FaCheckCircle className="h-4 w-4" />}
                >
                  Accept invite
                </Button>
              ) : (
                <Button
                  as={Link}
                  href={`/login?redirectTo=/invite/${token}`}
                  className="w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
                  startContent={<FaSignInAlt className="h-4 w-4" />}
                >
                  Log in to accept
                </Button>
              )}
            </>
          )}
        </div>
      </motion.section>
    </main>
  );
}
