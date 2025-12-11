'use client';

import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";


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
  isDeleting = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isDeleting) onCancel?.();
      }}
      hideCloseButton={isDeleting}
      isDismissable={!isDeleting}
      backdrop="blur"
      placement="center"
      className="max-w-md"
    >
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="text-base font-semibold text-rose-700">
              {title}
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-gray-600">{description}</p>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                color="default"
                onPress={() => {
                  if (!isDeleting) {
                    onCancel?.();
                    close();
                  }
                }}
                isDisabled={isDeleting}
              >
                {cancelLabel}
              </Button>
              <Button
                color="danger"
                onPress={onConfirm}
                isLoading={isDeleting}
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
