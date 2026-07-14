"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { FaCheckCircle } from "react-icons/fa";

function getCleanUrl(pathname, search) {
  const searchParams = new URLSearchParams(search);
  const params = new URLSearchParams(searchParams.toString());
  params.delete("inviteAccepted");
  params.delete("household");
  params.delete("merged");
  params.delete("summary");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function InviteAcceptedModal() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [details, setDetails] = useState({
    inviteAccepted: false,
    householdName: "your household",
    merged: false,
    summary: "your existing data",
    cleanUrl: pathname || "/",
  });

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const nextInviteAccepted = params.get("inviteAccepted") === "1";
    setDetails({
      inviteAccepted: nextInviteAccepted,
      householdName: params.get("household") || "your household",
      merged: params.get("merged") === "1",
      summary: params.get("summary") || "your existing data",
      cleanUrl: getCleanUrl(pathname || "/", searchParams.toString()),
    });

    if (!nextInviteAccepted) {
      setIsOpen(false);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const inviteAccepted = details.inviteAccepted;

    if (!inviteAccepted) {
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
  }, [details.inviteAccepted]);

  const handleContinue = () => {
    setIsOpen(false);
    router.replace(details.cleanUrl, { scroll: false });
  };

  if (!details.inviteAccepted) return null;

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
        wrapper: "z-[115] max-md:items-end",
        backdrop: "bg-slate-900/40",
        base: "max-md:m-0 max-md:w-screen max-md:max-w-none max-md:rounded-b-none max-md:rounded-t-2xl",
      }}
    >
      <ModalContent className="border border-gray-200 bg-white text-gray-800 shadow-2xl max-md:rounded-b-none max-md:rounded-t-2xl">
        <ModalHeader className="flex items-center gap-3 border-b border-emerald-200 bg-emerald-50 text-gray-950">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[var(--stocksense-brand)] shadow-sm">
            <FaCheckCircle className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold">Invite accepted</span>
            <span className="block text-sm font-normal text-emerald-800">
              You joined {details.householdName}.
            </span>
          </span>
        </ModalHeader>
        <ModalBody className="space-y-3 px-5 py-4 text-sm leading-5 text-gray-600">
          <p>
            Shared locations, areas, categories, and items from {details.householdName} are ready in your dashboard.
          </p>
          {details.merged ? (
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sky-800">
              Existing data merged: {details.summary} moved into {details.householdName}.
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter className="border-t border-gray-200 px-5 py-4">
          <Button
            className="min-h-11 w-full rounded-xl bg-[var(--stocksense-brand)] text-white"
            onPress={handleContinue}
            startContent={<FaCheckCircle className="h-4 w-4" />}
          >
            Continue
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
