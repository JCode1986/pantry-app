"use client";

import React, { useMemo, useState } from "react";
import { Input, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { FaSearch } from "react-icons/fa";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import { updateCategoryName, deleteCategory } from "@/app/actions/server";

export default function CategoriesPageClient({ initialCategories }) {
  const [categories, setCategories] = useState(initialCategories);
  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  const [renameValue, setRenameValue] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    payload: null,
    isDeleting: false,
  });

  const activeCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(activeCategoryId)) || null,
    [categories, activeCategoryId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const locMatch = (c.location?.name || "").toLowerCase().includes(q);
      const areaMatch = (c.storageArea?.name || "").toLowerCase().includes(q);
      const itemMatch = (c.items || []).some((i) => i.name.toLowerCase().includes(q));
      return nameMatch || locMatch || areaMatch || itemMatch;
    });
  }, [categories, search]);

  const openDrawer = (cat) => {
    setActiveCategoryId(cat.id);
    setRenameValue(cat.name);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveCategoryId(null);
    setRenameValue("");
  };

  const handleRename = async () => {
    if (!activeCategory) return;
    const name = renameValue.trim();
    if (!name) return;

    const result = await updateCategoryName(activeCategory.id, name);
    if (result?.error) {
      console.error(result.error);
      return;
    }

    setCategories((prev) =>
      prev.map((c) => (c.id === activeCategory.id ? { ...c, name } : c))
    );
  };

  const openDelete = () => {
    if (!activeCategory) return;
    setDeleteDialog({
      open: true,
      isDeleting: false,
      payload: {
        categoryId: activeCategory.id,
        name: activeCategory.name,
        storageAreaName: activeCategory.storageArea?.name,
        locationName: activeCategory.location?.name,
      },
    });
  };

  const closeDelete = () => {
    setDeleteDialog({ open: false, payload: null, isDeleting: false });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.payload) return;

    setDeleteDialog((p) => ({ ...p, isDeleting: true }));
    const { categoryId } = deleteDialog.payload;

    const result = await deleteCategory(categoryId);
    if (result?.error) {
      console.error(result.error);
      closeDelete();
      return;
    }

    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    closeDelete();
    closeDrawer();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-stocksense-gray bg-white p-4 md:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-stocksense-teal">
              Categories
            </h1>
            <p className="text-sm text-gray-500">
              View categories across all locations. Click one to view details.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search categories, locations, areas, items…"
              startContent={<FaSearch className="text-gray-400" />}
              classNames={{
                inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
              }}
            />
            {/* Add Category (optional): requires selecting location/area because categories belong to an area */}
            <Button className="rounded-xl bg-[#0E7488] text-white">
              + Add Category
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => openDrawer(c)}
            className="text-left rounded-2xl border border-stocksense-gray bg-white shadow-sm p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-stocksense-teal truncate">
                  {c.name}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {c.location?.name} → {c.storageArea?.name}
                </div>
              </div>

              <div className="shrink-0">
                <span className="px-2.5 py-1 rounded-full text-xs bg-[#E6FAF6] text-[#0E7488] border border-[#9FE7D7]">
                  {c.itemsCount} {c.itemsCount === 1 ? "item" : "items"}
                </span>
              </div>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-stocksense-gray bg-white p-8 text-center text-gray-500">
            No categories match your search.
          </div>
        )}
      </div>

      {/* Drawer (HeroUI Modal styled as right drawer) */}
      <Modal
        isOpen={drawerOpen}
        onOpenChange={(open) => (open ? null : closeDrawer())}
        placement="right"
        size="lg"
        classNames={{
          base: "rounded-none md:rounded-l-2xl h-full md:h-[calc(100vh-24px)] md:my-3",
          wrapper: "items-stretch justify-end",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="text-stocksense-teal font-semibold text-lg">
                  {activeCategory?.name || "Category"}
                </div>
                <div className="text-sm text-gray-500">
                  {activeCategory?.location?.name} → {activeCategory?.storageArea?.name}
                </div>
              </ModalHeader>

              <ModalBody className="space-y-4">
                {/* Rename */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Category name</div>
                  <Input
                    value={renameValue}
                    onValueChange={setRenameValue}
                    classNames={{
                      inputWrapper: "rounded-xl border border-stocksense-gray shadow-none",
                    }}
                  />
                  <Button
                    onClick={handleRename}
                    className="rounded-xl bg-[#0E7488] text-white w-full"
                  >
                    Save name
                  </Button>
                </div>

                {/* Items preview */}
                <div>
                  <div className="text-sm font-semibold text-stocksense-teal mb-2">
                    Items ({activeCategory?.itemsCount ?? 0})
                  </div>

                  <div className="space-y-2">
                    {(activeCategory?.items || []).slice(0, 8).map((it) => (
                      <div
                        key={it.id}
                        className="rounded-xl border border-stocksense-gray bg-white p-3 flex justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-stocksense-teal truncate">{it.name}</div>
                          <div className="text-sm text-gray-500 truncate">
                            Qty: {it.quantity ?? 0} • Exp: {it.expiration_date || "—"}
                          </div>
                        </div>
                      </div>
                    ))}

                    {(activeCategory?.items || []).length === 0 && (
                      <div className="text-sm text-gray-500">
                        No items in this category yet.
                      </div>
                    )}

                    {(activeCategory?.items || []).length > 8 && (
                      <div className="text-xs text-gray-400">
                        Showing first 8 items…
                      </div>
                    )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter>
                <Button variant="light" className="rounded-xl" onClick={closeDrawer}>
                  Close
                </Button>
                <Button
                  className="rounded-xl bg-rose-600 text-white"
                  onClick={openDelete}
                >
                  Delete category
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDeleteModal
        isOpen={deleteDialog.open}
        isDeleting={deleteDialog.isDeleting}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        title={
          deleteDialog.payload
            ? `Delete category "${deleteDialog.payload.name}"?`
            : "Delete category?"
        }
        description={
          deleteDialog.payload
            ? `This will delete "${deleteDialog.payload.name}" in ${deleteDialog.payload.locationName} → ${deleteDialog.payload.storageAreaName}, including all items inside it. This cannot be undone.`
            : ""
        }
      />
    </div>
  );
}
