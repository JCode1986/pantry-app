"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import NativeButton from "@/components/ui/NativeButton";
import { FaSignOutAlt, FaSpinner } from "react-icons/fa";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
} from "@/components/modals/modalTheme";

export default function NavigationLogoutModal({
  isOpen,
  onOpenChange,
  loggingOut,
  onLogout,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
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
              Confirm logout
            </ModalHeader>
            <ModalBody className={modalBodyClass}>
              <p className="text-sm text-gray-600">
                Are you sure you want to log out?
              </p>
            </ModalBody>
            <ModalFooter className={modalFooterClass}>
              <NativeButton
                variant="light"
                className="rounded-xl"
                onPress={onClose}
                isDisabled={loggingOut}
              >
                Cancel
              </NativeButton>
              <NativeButton
                className="rounded-xl bg-rose-600 text-white"
                onPress={async () => {
                  onClose();
                  await onLogout();
                }}
                isDisabled={loggingOut}
                startContent={
                  loggingOut ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaSignOutAlt />
                  )
                }
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </NativeButton>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
