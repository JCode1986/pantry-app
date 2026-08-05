"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/NativeModal";
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
    >
      <ModalContent
        className={`${modalContentClass} max-md:h-auto max-md:max-h-[80svh] max-md:!w-[calc(100vw-2rem)] max-md:!max-w-md max-md:rounded-b-2xl max-md:rounded-t-2xl max-md:border max-md:border-gray-200 max-md:bg-white max-md:shadow-2xl`}
        style={modalContentStyle}
      >
        {(onClose) => (
          <>
            <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
              Confirm logout
            </ModalHeader>
            <ModalBody className={`${modalBodyClass} pb-7`}>
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
                  await new Promise((resolve) => {
                    window.setTimeout(resolve, 180);
                  });
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
