"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/NativeModal";
import NativeButton from "@/components/ui/NativeButton";
import { FaTimesCircle } from "react-icons/fa";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
} from "@/components/modals/modalTheme";

export default function NavigationRemoveMemberModal({
  candidate,
  actionLoading,
  onCancel,
  onConfirm,
}) {
  const memberLabel =
    candidate?.displayName || candidate?.email || "this member";
  const removing = actionLoading === `remove:${candidate?.userId}`;

  return (
    <Modal
      isOpen={Boolean(candidate)}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
      placement="center"
      classNames={{
        wrapper: "max-md:items-end",
        base: "max-md:m-0 max-md:w-screen max-md:max-w-none max-md:rounded-b-none max-md:rounded-t-2xl",
      }}
    >
      <ModalContent
        className={`${modalContentClass} max-md:h-auto max-md:max-h-[80svh] max-md:rounded-b-none max-md:rounded-t-2xl max-md:border max-md:border-gray-200 max-md:bg-white max-md:shadow-2xl`}
        style={modalContentStyle}
      >
        {(onClose) => (
          <>
            <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
              Remove member
            </ModalHeader>
            <ModalBody className={modalBodyClass}>
              <p className="text-sm text-gray-600">
                Remove {memberLabel} from this household? They will lose access
                to this shared inventory.
              </p>
            </ModalBody>
            <ModalFooter className={modalFooterClass}>
              <NativeButton
                variant="light"
                className="rounded-xl"
                onPress={onClose}
                isDisabled={removing}
              >
                Cancel
              </NativeButton>
              <NativeButton
                className="rounded-xl bg-rose-600 text-white"
                onPress={() => onConfirm(candidate)}
                isLoading={removing}
                isDisabled={!candidate}
                startContent={
                  !removing && <FaTimesCircle className="h-3.5 w-3.5" />
                }
              >
                Remove member
              </NativeButton>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
