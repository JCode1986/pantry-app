"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { FaPlus, FaShoppingBasket } from "react-icons/fa";
import { addShoppingListItemAction } from "@/app/actions/shoppingList";
import { toNonNegativeInteger } from "@/utils/pantry/date";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
} from "@/components/modals/modalTheme";

const EMPTY_FORM = {
  name: "",
  quantity: "1",
};

export default function AddShoppingListItemModal({
  isOpen,
  onClose,
  onAdded,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setMessage("");
  }, [isOpen]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleClose = () => {
    if (isSaving) return;
    setMessage("");
    onClose?.();
  };

  const handleSubmit = async ({ closeAfterAdd = true } = {}) => {
    const name = form.name.trim();
    if (!name) {
      setMessage("Item name is required.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    let result;
    try {
      result = await addShoppingListItemAction({
        name,
        quantity: toNonNegativeInteger(form.quantity, 1),
      });
    } catch (error) {
      console.error("addShoppingListItemAction error:", error);
      setMessage("Could not add shopping list item.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);

    if (result?.error) {
      setMessage(result.error);
      return;
    }

    onAdded?.(result.data);
    setForm(EMPTY_FORM);
    setMessage("");

    if (closeAfterAdd) {
      onClose?.();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      placement="center"
      size="md"
    >
      <ModalContent className={modalContentClass} style={modalContentStyle}>
        {() => (
          <>
            <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
              <span className="inline-flex items-center gap-2">
                <FaShoppingBasket className="h-4 w-4" />
                Add to shopping list
              </span>
            </ModalHeader>

            <ModalBody className={`space-y-4 ${modalBodyClass}`}>
              {message ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {message}
                </p>
              ) : null}

              <Input
                label="Item"
                value={form.name}
                onValueChange={(value) => updateForm("name", value)}
                placeholder="Milk, paper towels, coffee..."
                variant="bordered"
                radius="lg"
                isDisabled={isSaving}
                classNames={modalInputClassNames}
                autoFocus
              />

              <Input
                label="Quantity"
                value={form.quantity}
                onValueChange={(value) => updateForm("quantity", value)}
                type="number"
                min={0}
                variant="bordered"
                radius="lg"
                isDisabled={isSaving}
                classNames={modalInputClassNames}
              />
            </ModalBody>

            <ModalFooter className={modalFooterClass}>
              <Button
                variant="light"
                className="rounded-xl"
                onPress={handleClose}
                isDisabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="flat"
                className="rounded-xl"
                onPress={() => handleSubmit({ closeAfterAdd: false })}
                isDisabled={isSaving}
              >
                Add another
              </Button>
              <Button
                className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                onPress={() => handleSubmit({ closeAfterAdd: true })}
                isLoading={isSaving}
                startContent={!isSaving ? <FaPlus /> : null}
              >
                Add
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
