"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardBody,
  Button,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Skeleton,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { FaPlus, FaSearch, FaEllipsisV, FaTag, FaChevronLeft } from "react-icons/fa";

import {
  addCategory,
  updateCategoryName,
  deleteCategory,
} from "@/app/actions/server";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
} from "@/components/modals/modalTheme";
import { containsQuery } from "@/utils/pantry/search";
import OpenGlobalAddItemButton from "@/components/ui/OpenGlobalAddItemButton";

function StatPill({ label, value }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-xs bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] border border-[var(--stocksense-brand-border)]">
      <strong>{value}</strong> {label}
    </span>
  );
}

const pageVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const pageItemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, type: "spring", stiffness: 120 },
  },
};

export default function AreaDetailClient({ area, initialCategories }) {
  const [categories, setCategories] = useState(initialCategories ?? []);
  const [search, setSearch] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const [renameModal, setRenameModal] = useState({
    open: false,
    id: null,
    name: "",
  });

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    name: "",
    busy: false,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => containsQuery(c.name, q));
  }, [categories, search]);

  const totals = useMemo(() => {
    return {
      categories: categories.length,
      items: categories.reduce((sum, c) => sum + (c.itemsCount || 0), 0),
    };
  }, [categories]);

  useEffect(() => {
    const handleItemAdded = (event) => {
      const item = event.detail?.item;
      if (!item?.categoryId || String(item.storageAreaId) !== String(area?.id)) {
        return;
      }

      setCategories((prev) => {
        const categoryExists = prev.some(
          (category) => String(category.id) === String(item.categoryId)
        );

        if (!categoryExists) {
          return [
            ...prev,
            {
              id: item.categoryId,
              name: item.categoryName ?? "Category",
              itemsCount: 1,
            },
          ].sort((a, b) => a.name.localeCompare(b.name));
        }

        return prev.map((category) =>
          String(category.id) === String(item.categoryId)
            ? {
                ...category,
                itemsCount: (category.itemsCount ?? 0) + 1,
              }
            : category
        );
      });
    };

    window.addEventListener("stocksense:item-added", handleItemAdded);

    return () => {
      window.removeEventListener("stocksense:item-added", handleItemAdded);
    };
  }, [area?.id]);

  // ---------------- Actions ----------------

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;

    setIsSaving(true);

    // Optimistic insert (temp id)
    const tempId = `temp-${Date.now()}`;
    const optimistic = { id: tempId, name, itemsCount: 0, _optimistic: true };

    setCategories((prev) =>
      [...prev, optimistic].sort((a, b) => a.name.localeCompare(b.name))
    );
    setNewCategory("");

    try {
      const result = await addCategory(area.id, name);

      if (result?.error) {
        throw result.error;
      }

      const created = result?.data;
      if (!created?.id) throw new Error("Category create failed: no id returned");

      setCategories((prev) =>
        prev
          .map((c) =>
            c.id === tempId
              ? { id: created.id, name: created.name, itemsCount: 0 }
              : c
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (e) {
      console.error("addCategory failed:", e);

      // rollback optimistic
      setCategories((prev) => prev.filter((c) => c.id !== tempId));
      alert("Failed to add category. Please try again.");
      setNewCategory(name);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRename = async () => {
    const name = renameModal.name.trim();
    if (!name || !renameModal.id) return;

    const id = renameModal.id;
    const prevName = categories.find((c) => c.id === id)?.name;

    setIsSaving(true);

    // optimistic rename
    setCategories((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, name } : c))
        .sort((a, b) => a.name.localeCompare(b.name))
    );

    try {
      const result = await updateCategoryName(id, name);
      if (result?.error) throw result.error;

      setRenameModal({ open: false, id: null, name: "" });
    } catch (e) {
      console.error("updateCategoryName failed:", e);

      // rollback
      setCategories((prev) =>
        prev
          .map((c) => (c.id === id ? { ...c, name: prevName || c.name } : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      alert("Failed to rename category. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;

    const id = deleteModal.id;

    setDeleteModal((p) => ({ ...p, busy: true }));

    // optimistic remove
    const snapshot = categories;
    setCategories((prev) => prev.filter((c) => c.id !== id));

    try {
      const result = await deleteCategory(id);
      if (result?.error) throw result.error;

      setDeleteModal({ open: false, id: null, name: "", busy: false });
    } catch (e) {
      console.error("deleteCategory failed:", e);

      // rollback
      setCategories(snapshot);
      setDeleteModal((p) => ({ ...p, busy: false }));

      alert("Failed to delete category. Please try again.");
    }
  };

  // ---------------- UI ----------------

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="show" className="space-y-5">
      {/* Header */}
      <motion.div variants={pageItemVariants} className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/areas" className="inline-flex items-center gap-2 hover:text-[var(--stocksense-brand)]">
            <FaChevronLeft className="h-3.5 w-3.5" />
            Areas
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600">{area?.location?.name || "Location"}</span>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-gray-800">{area?.name || "Area"}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-stocksense-teal">
              {area?.name}
            </h1>
            <p className="text-sm text-gray-500">
              Manage categories for <span className="font-medium">{area?.location?.name}</span>.
              Click a category to view items.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatPill
                label={totals.categories === 1 ? "Category" : "Categories"}
                value={totals.categories}
              />
              <StatPill
                label={totals.items === 1 ? "Item" : "Items"}
                value={totals.items}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search categories…"
              startContent={<FaSearch className="text-gray-400" />}
              className="sm:w-[320px]"
              radius="lg"
              variant="bordered"
            />
            <OpenGlobalAddItemButton
              context={{
                locationId: area?.location?.id,
                storageAreaId: area?.id,
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Add Category */}
      <motion.div variants={pageItemVariants}>
        <Card className="border border-stocksense-gray shadow-sm">
        <CardBody className="p-4">
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Input
              value={newCategory}
              onValueChange={setNewCategory}
              placeholder={`Add a category in ${area?.name} (e.g., Fruits, Snacks)`}
              radius="lg"
              variant="bordered"
              className="w-full"
              isDisabled={isSaving}
            />
            <Button
              className="rounded-xl bg-[var(--stocksense-brand)] text-white"
              onPress={handleAddCategory}
              isDisabled={isSaving || !newCategory.trim()}
              startContent={<FaPlus />}
            >
              Add Category
            </Button>
          </div>

          {/* saving hint */}
          {isSaving && (
            <div className="mt-3">
              <Skeleton className="rounded-lg">
                <div className="h-3 w-44" />
              </Skeleton>
            </div>
          )}
        </CardBody>
        </Card>
      </motion.div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, delay: idx * 0.02 }}
            >
              <Card className="group border border-stocksense-gray shadow-sm hover:shadow-md transition">
                <CardBody className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/categories/${cat.id}`} className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="rounded-xl p-2 bg-[var(--stocksense-brand-soft)] border border-[var(--stocksense-brand-border)] text-[var(--stocksense-brand)]">
                          <FaTag />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-stocksense-teal truncate group-hover:underline">
                            {cat.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {cat.itemsCount} {cat.itemsCount === 1 ? "item" : "items"}
                          </p>
                        </div>
                      </div>
                    </Link>

                    <Dropdown placement="bottom-end">
                      <DropdownTrigger>
                        <Button isIconOnly variant="light" radius="lg" isDisabled={isSaving}>
                          <FaEllipsisV className="text-gray-500" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Category actions">
                        <DropdownItem
                          key="rename"
                          onPress={() =>
                            setRenameModal({ open: true, id: cat.id, name: cat.name })
                          }
                        >
                          Rename
                        </DropdownItem>
                        <DropdownItem
                          key="delete"
                          className="text-danger"
                          color="danger"
                          onPress={() =>
                            setDeleteModal({ open: true, id: cat.id, name: cat.name, busy: false })
                          }
                        >
                          Delete
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>

                  <div className="mt-4">
                    <Link
                      href={`/categories/${cat.id}`}
                      className="inline-flex items-center gap-2 text-sm text-[var(--stocksense-brand)] hover:underline"
                    >
                      View items →
                    </Link>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <Card className="border border-dashed border-stocksense-gray">
            <CardBody className="p-8 text-center">
              <p className="text-sm text-gray-600 font-medium">No categories found</p>
              <p className="text-xs text-gray-500 mt-1">
                Try a different search, or add a new category above.
              </p>
              <div className="mt-4 flex justify-center">
                <OpenGlobalAddItemButton
                  context={{
                    locationId: area?.location?.id,
                    storageAreaId: area?.id,
                  }}
                />
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Rename Modal */}
      <Modal
        isOpen={renameModal.open}
        onOpenChange={(open) => setRenameModal((p) => ({ ...p, open }))}
        placement="center"
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {(onClose) => (
            <>
              <ModalHeader className={modalHeaderClass}>Rename category</ModalHeader>
              <ModalBody className={modalBodyClass}>
                <Input
                  value={renameModal.name}
                  onValueChange={(v) => setRenameModal((p) => ({ ...p, name: v }))}
                  variant="bordered"
                  radius="lg"
                  label="Category name"
                  isDisabled={isSaving}
                  classNames={modalInputClassNames}
                />
              </ModalBody>
              <ModalFooter className={modalFooterClass}>
                <Button variant="light" onPress={onClose} isDisabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  className="bg-[var(--stocksense-brand)] text-white"
                  onPress={handleRename}
                  isDisabled={isSaving || !renameModal.name.trim()}
                >
                  Save
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onOpenChange={(open) => setDeleteModal((p) => ({ ...p, open }))}
        placement="center"
      >
        <ModalContent className={modalContentClass} style={modalContentStyle}>
          {(onClose) => (
            <>
              <ModalHeader className={modalHeaderClass}>Delete category</ModalHeader>
              <ModalBody className={modalBodyClass}>
                <p className="text-sm text-gray-600">
                  Delete <span className="font-semibold">{deleteModal.name}</span>? This will remove
                  the category and its items.
                </p>
              </ModalBody>
              <ModalFooter className={modalFooterClass}>
                <Button
                  variant="light"
                  onPress={onClose}
                  isDisabled={deleteModal.busy || isSaving}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-rose-600 text-white"
                  onPress={handleDelete}
                  isDisabled={deleteModal.busy || isSaving}
                >
                  {deleteModal.busy ? "Deleting..." : "Delete"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </motion.div>
  );
}
