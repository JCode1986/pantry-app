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
import MobileSuggestionChips from "@/components/modals/MobileSuggestionChips";
import MobileSheetCloseButton from "@/components/modals/MobileSheetCloseButton";

const EMPTY_FORM = {
  name: "",
  quantity: "1",
};

const SHOPPING_SUGGESTIONS = ["Milk", "Bread", "Eggs", "Rice", "Dog food"];

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
            <ModalHeader className={`flex gap-3 ${modalHeaderClass}`}>
              <span className="inline-flex min-w-0 flex-1 items-center gap-2 truncate">
                <FaShoppingBasket className="h-4 w-4 shrink-0" />
                <span className="truncate">Add to shopping list</span>
              </span>
              <MobileSheetCloseButton onPress={handleClose} />
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
                placeholder="e.g., Milk, paper towels, coffee"
                variant="bordered"
                radius="lg"
                isDisabled={isSaving}
                classNames={modalInputClassNames}
                autoFocus
              />
              <MobileSuggestionChips
                suggestions={SHOPPING_SUGGESTIONS}
                onSelect={(name) => updateForm("name", name)}
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
                className="rounded-xl max-md:hidden"
                onPress={handleClose}
                isDisabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="flat"
                className="rounded-xl max-md:hidden"
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
                <span className="md:hidden">Create Shopping List Item</span>
                <span className="max-md:hidden">Add</span>
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
