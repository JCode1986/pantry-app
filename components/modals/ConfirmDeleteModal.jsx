'use client';

import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
} from "@/components/modals/modalTheme";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";


// import {
//   Modal,
//   ModalContent,
//   ModalHeader,
//   ModalBody,
//   ModalFooter,
//   Button,
// } from '@heroui/modal';

export default function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Keep',
  secondaryConfirmLabel = null,
  secondaryConfirmClassName = '',
  isSecondaryConfirming = false,
  isDeleting = false,
  onConfirm,
  onSecondaryConfirm,
  onCancel,
}) {
  const isBusy = isDeleting || isSecondaryConfirming;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isBusy) onCancel?.();
      }}
      hideCloseButton={isBusy}
      isDismissable={!isBusy}
      backdrop="blur"
      placement="center"
      className="max-w-md"
      classNames={{
        wrapper: "max-md:items-end",
      }}
    >
      <ModalContent
        className={`${modalContentClass} max-md:h-auto max-md:max-h-[80dvh] max-md:rounded-b-none max-md:rounded-t-2xl max-md:border max-md:border-gray-200 max-md:bg-white max-md:shadow-2xl`}
        style={modalContentStyle}
      >
        {(close) => (
          <>
            <ModalHeader className={`${modalHeaderClass} max-md:static max-md:flex max-md:items-center max-md:gap-3`}>
              <span className="min-w-0 flex-1 truncate">{title}</span>
              {!isBusy ? (
                <MobileSheetCloseButton
                  onPress={() => {
                    onCancel?.();
                    close();
                  }}
                />
              ) : null}
            </ModalHeader>
            <ModalBody className={`${modalBodyClass} max-md:pb-4`}>
              <p className="text-sm text-gray-600">{description}</p>
            </ModalBody>
            <ModalFooter
              className={`${modalFooterClass} flex flex-col-reverse gap-2 sm:flex-row sm:justify-end max-md:static`}
            >
              <Button
                variant="flat"
                color="default"
                className="min-h-11 rounded-xl"
                onPress={() => {
                  if (!isBusy) {
                    onCancel?.();
                    close();
                  }
                }}
                isDisabled={isBusy}
              >
                {cancelLabel}
              </Button>
              {secondaryConfirmLabel && onSecondaryConfirm ? (
                <Button
                  className={`min-h-11 rounded-xl ${secondaryConfirmClassName}`}
                  onPress={onSecondaryConfirm}
                  isLoading={isSecondaryConfirming}
                  isDisabled={isDeleting}
                >
                  {secondaryConfirmLabel}
                </Button>
              ) : null}
              <Button
                color="danger"
                className="min-h-11 rounded-xl"
                onPress={onConfirm}
                isLoading={isDeleting}
                isDisabled={isSecondaryConfirming}
              >
                {confirmLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
