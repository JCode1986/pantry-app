"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import { FaEdit } from "react-icons/fa";
import { updateShoppingListItemAction } from "@/app/actions/shoppingList";
import { toNonNegativeInteger } from "@/utils/pantry/date";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
  themedSelectClassNames,
} from "@/components/modals/modalTheme";

const STATUS_OPTIONS = [
  { value: "needed", label: "Needed" },
  { value: "purchased", label: "Purchased" },
  { value: "dismissed", label: "Dismissed" },
];

function itemToForm(item) {
  return {
    name: item?.name ?? "",
    quantity: String(item?.quantity ?? 0),
    status: item?.status ?? "needed",
  };
}

export default function EditShoppingListItemModal({
  item,
  isOpen,
  onClose,
  onUpdated,
}) {
  const [form, setForm] = useState(() => itemToForm(item));
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(itemToForm(item));
    setMessage("");
  }, [isOpen, item]);

  const hasChanges = useMemo(() => {
    if (!item) return false;

    const nextName = form.name.trim();
    if (!nextName) return false;

    return (
      nextName !== (item.name ?? "") ||
      toNonNegativeInteger(form.quantity, 0) !== (item.quantity ?? 0) ||
      form.status !== (item.status ?? "needed")
    );
  }, [form, item]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleClose = () => {
    if (isSaving) return;
    setMessage("");
    onClose?.();
  };

  const handleSave = async () => {
    if (!item?.id) return;

    const name = form.name.trim();
    if (!name) {
      setMessage("Item name is required.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    let result;
    try {
      result = await updateShoppingListItemAction(item.id, {
        name,
        quantity: toNonNegativeInteger(form.quantity, 0),
        status: form.status,
      });
    } catch (error) {
      console.error("updateShoppingListItemAction error:", error);
      setMessage("Could not update shopping list item.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);

    if (result?.error) {
      setMessage(result.error);
      return;
    }

    onUpdated?.(result.data);
    onClose?.();
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
                <FaEdit className="h-4 w-4" />
                Edit shopping list item
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
                variant="bordered"
                radius="lg"
                isDisabled={isSaving}
                classNames={modalInputClassNames}
                autoFocus
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

                <Select
                  label="Status"
                  selectedKeys={new Set([form.status])}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0];
                    if (value) updateForm("status", String(value));
                  }}
                  variant="bordered"
                  radius="lg"
                  isDisabled={isSaving}
                  classNames={themedSelectClassNames}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value}>{option.label}</SelectItem>
                  ))}
                </Select>
              </div>
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
                className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                onPress={handleSave}
                isLoading={isSaving}
                isDisabled={!hasChanges}
              >
                Save changes
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
