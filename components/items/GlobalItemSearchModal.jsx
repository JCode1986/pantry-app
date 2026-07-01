"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaArrowRight,
  FaBoxOpen,
  FaMapMarkerAlt,
  FaSearch,
  FaSpinner,
  FaTags,
  FaWarehouse,
} from "react-icons/fa";
import { searchItems } from "@/app/actions/server";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
} from "@/components/modals/modalTheme";

function itemPath(item) {
  const parts = [
    item.location?.name,
    item.storageArea?.name,
    item.category?.name,
  ].filter(Boolean);

  return parts.length ? parts.join(" / ") : "No location path";
}

export default function GlobalItemSearchModal({ isOpen, onClose }) {
  const router = useRouter();
  const requestId = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const trimmedQuery = query.trim();
  const hasSearchTerm = trimmedQuery.length >= 2;

  const resultSummary = useMemo(() => {
    if (!hasSearchTerm) return "Enter at least 2 characters.";
    if (isSearching) return "Searching inventory...";
    if (error) return error;
    if (results.length === 0) return "No matching items found.";
    return `${results.length} ${results.length === 1 ? "match" : "matches"} found.`;
  }, [error, hasSearchTerm, isSearching, results.length]);

  const itemNameCounts = useMemo(() => {
    return results.reduce((counts, item) => {
      const name = item.name?.trim().toLowerCase();
      if (!name) return counts;
      counts.set(name, (counts.get(name) ?? 0) + 1);
      return counts;
    }, new Map());
  }, [results]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setError("");
      setIsSearching(false);
      return;
    }

    if (!hasSearchTerm) {
      setResults([]);
      setError("");
      setIsSearching(false);
      return;
    }

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setIsSearching(true);
    setError("");

    const timeout = window.setTimeout(async () => {
      try {
        const result = await searchItems(trimmedQuery);
        if (requestId.current !== currentRequest) return;

        if (result?.error) {
          setError(result.error);
          setResults([]);
        } else {
          setResults(result?.data ?? []);
        }
      } catch (err) {
        console.error("searchItems error:", err);
        if (requestId.current !== currentRequest) return;
        setError("Could not search items.");
        setResults([]);
      } finally {
        if (requestId.current === currentRequest) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [hasSearchTerm, isOpen, trimmedQuery]);

  const openResult = (item) => {
    onClose?.();
    if (item.category?.id) {
      router.push(`/categories/${item.category.id}`);
      return;
    }
    router.push("/items");
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
      placement="center"
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalContent
        className={`${modalContentClass} overflow-hidden`}
        style={modalContentStyle}
      >
        {() => (
          <>
            <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
              <span className="text-[var(--stocksense-brand)]">Find item</span>
              <span className="text-sm font-normal text-gray-500">
                Search item names across every location, area, and category.
              </span>
            </ModalHeader>

            <ModalBody className={`space-y-4 ${modalBodyClass}`}>
              <Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search for rice, pasta, batteries..."
                startContent={<FaSearch className="text-gray-400" />}
                endContent={isSearching ? <FaSpinner className="animate-spin text-gray-400" /> : null}
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
              />

              <div className="text-sm text-gray-500">{resultSummary}</div>

              <div className="min-h-[220px] space-y-2">
                <AnimatePresence initial={false}>
                  {results.map((item) => {
                    const duplicateCount =
                      itemNameCounts.get(item.name?.trim().toLowerCase()) ?? 0;
                    const imageUrl =
                      item.imageUrl || item.storageArea?.imageUrl || item.location?.imageUrl;

                    return (
                      <motion.button
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        onClick={() => openResult(item)}
                        className="w-full rounded-xl border border-stocksense-gray bg-white p-4 text-left shadow-sm transition hover:-translate-y-[1px] hover:bg-gray-50 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 gap-3">
                            {imageUrl ? (
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-gray-50">
                                <img
                                  src={imageUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)]">
                                <FaBoxOpen className="h-5 w-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-[var(--stocksense-brand)]">
                                {item.name}
                              </span>
                              {duplicateCount > 1 && (
                                <span className="rounded-full border border-[var(--stocksense-brand-border)] bg-[var(--stocksense-brand-soft)] px-2 py-0.5 text-[11px] text-[var(--stocksense-brand)]">
                                  {duplicateCount} places
                                </span>
                              )}
                            </div>

                            <div className="mt-2 grid gap-1 text-sm text-gray-600">
                              <span className="inline-flex items-center gap-2">
                                <FaMapMarkerAlt className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                                {itemPath(item)}
                              </span>
                              <span className="inline-flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1">
                                  <FaBoxOpen className="h-3 w-3" />
                                  Qty: {item.quantity ?? 0}
                                </span>
                                <span>
                                  Exp: {item.expirationDate || "None"}
                                </span>
                              </span>
                              <span className="inline-flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                                <span className="inline-flex items-center gap-1">
                                  <FaWarehouse className="h-3 w-3" />
                                  {item.storageArea?.name || "Unknown area"}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <FaTags className="h-3 w-3" />
                                  {item.category?.name || "Unknown category"}
                                </span>
                              </span>
                            </div>
                            </div>
                          </div>

                          <FaArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-300" />
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ModalBody>

            <ModalFooter className={modalFooterClass}>
              <Button variant="light" className="rounded-xl" onPress={onClose}>
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
