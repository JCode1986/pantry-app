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
  cancelLabel = 'Cancel',
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
    >
      <ModalContent className={modalContentClass} style={modalContentStyle}>
        {(close) => (
          <>
            <ModalHeader className={modalHeaderClass}>
              {title}
            </ModalHeader>
            <ModalBody className={modalBodyClass}>
              <p className="text-sm text-gray-600">{description}</p>
            </ModalBody>
            <ModalFooter
              className={`${modalFooterClass} flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`}
            >
              <Button
                variant="flat"
                color="default"
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
                  className={secondaryConfirmClassName}
                  onPress={onSecondaryConfirm}
                  isLoading={isSecondaryConfirming}
                  isDisabled={isDeleting}
                >
                  {secondaryConfirmLabel}
                </Button>
              ) : null}
              <Button
                color="danger"
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
