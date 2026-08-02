"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { FaBoxOpen, FaMapMarkedAlt, FaTags, FaWarehouse } from "react-icons/fa";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
} from "@/components/modals/modalTheme";

export default function NavigationAddActionSheet({
  isOpen,
  onOpenChange,
  onAddItem,
  onAddLocation,
  onAddArea,
  onAddCategory,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="bottom"
      classNames={{
        wrapper: "max-md:items-end",
        base: "mx-0 mb-0 max-md:w-screen max-md:max-w-none rounded-b-none rounded-t-2xl sm:mx-auto sm:mb-4 sm:rounded-2xl",
      }}
    >
      <ModalContent
        className={`${modalContentClass} max-md:h-auto max-md:max-h-[85svh] max-md:rounded-b-none max-md:rounded-t-2xl max-md:border max-md:border-gray-200 max-md:bg-white max-md:shadow-2xl`}
        style={modalContentStyle}
      >
        {(onClose) => (
          <>
            <ModalHeader className={modalHeaderClass}>Add to WhereKeep</ModalHeader>
            <ModalBody className={`${modalBodyClass} grid gap-2`}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddItem();
                }}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-gray-700 shadow-sm transition hover:border-[var(--entity-item-border)] hover:bg-gray-50"
              >
                <FaBoxOpen className="h-4 w-4 shrink-0 text-[var(--entity-item-accent)]" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Add item</span>
                  <span className="block text-xs text-gray-600">
                    Scan, upload, or type item details.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddLocation();
                }}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-gray-700 shadow-sm transition hover:border-[var(--entity-location-border)] hover:bg-gray-50"
              >
                <FaMapMarkedAlt className="h-4 w-4 shrink-0 text-[var(--entity-location-accent)]" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Add location</span>
                  <span className="block text-xs text-gray-600">
                    Create the place that holds storage areas.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddArea();
                }}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-gray-700 shadow-sm transition hover:border-[var(--entity-area-border)] hover:bg-gray-50"
              >
                <FaWarehouse className="h-4 w-4 shrink-0 text-[var(--entity-area-accent)]" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Add storage area</span>
                  <span className="block text-xs text-gray-600">
                    Choose a location, then add its room, shelf, or bin.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddCategory();
                }}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-gray-700 shadow-sm transition hover:border-[var(--entity-category-border)] hover:bg-gray-50"
              >
                <FaTags className="h-4 w-4 shrink-0 text-[var(--entity-category-accent)]" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Add category</span>
                  <span className="block text-xs text-gray-600">
                    Choose a location and storage area, then add its category.
                  </span>
                </span>
              </button>
            </ModalBody>
            <ModalFooter className={modalFooterClass}>
              <Button variant="light" className="rounded-xl" onPress={onClose}>
                Cancel
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
