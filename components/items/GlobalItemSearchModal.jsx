"use client";

import { useEffect, useRef, useState } from "react";
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
  FaBoxOpen,
  FaCalendarAlt,
  FaChevronRight,
  FaHistory,
  FaMapMarkerAlt,
  FaMicrophone,
  FaPlus,
  FaSearch,
  FaSpinner,
  FaTimes,
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

const RECENT_SEARCHES_KEY = "wherekeep:recent-item-searches";
const MAX_RECENT_SEARCHES = 6;

function itemPath(item) {
  const parts = [
    item.location?.name,
    item.storageArea?.name,
    item.category?.name,
  ].filter(Boolean);

  return parts.length ? parts.join(" > ") : "No location path";
}

function formatExpirationDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function normalizeRecentSearch(value) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

function getStoredRecentSearches() {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RECENT_SEARCHES_KEY) || "[]"
    );
    return Array.isArray(parsed)
      ? parsed.map(normalizeRecentSearch).filter(Boolean).slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch {
    return [];
  }
}

export default function GlobalItemSearchModal({ isOpen, onClose }) {
  const router = useRouter();
  const requestId = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [toastMessage, setToastMessage] = useState("");

  const trimmedQuery = query.trim();
  const hasSearchTerm = trimmedQuery.length >= 2;

  const showEmptyState =
    hasSearchTerm && !isSearching && !error && results.length === 0;

  const rememberSearch = (value) => {
    const nextValue = normalizeRecentSearch(value);
    if (!nextValue) return;

    setRecentSearches((current) => {
      const next = [
        nextValue,
        ...current.filter(
          (item) => item.toLowerCase() !== nextValue.toLowerCase()
        ),
      ].slice(0, MAX_RECENT_SEARCHES);

      try {
        window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {
        // Local storage is optional for this UI.
      }

      return next;
    });
  };

  const showVoiceSearchToast = () => {
    setToastMessage("Voice search coming soon");
    window.setTimeout(() => setToastMessage(""), 2600);
  };

  const openAddFromSearch = () => {
    const itemName = normalizeRecentSearch(trimmedQuery);
    if (!itemName) return;

    rememberSearch(itemName);
    onClose?.();
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("stocksense:open-add-item", {
          detail: { itemName },
        })
      );
    }, 0);
  };

  useEffect(() => {
    if (!isOpen) return;
    setRecentSearches(getStoredRecentSearches());
    setToastMessage("");
  }, [isOpen]);

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
          const nextResults = result?.data ?? [];
          setResults(nextResults);
          if (nextResults.length > 0) {
            rememberSearch(trimmedQuery);
          }
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
    rememberSearch(item.name || trimmedQuery);
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
      classNames={{
        wrapper: "max-md:items-stretch max-md:justify-stretch max-md:overflow-hidden max-md:p-0",
        base: "max-md:m-0 max-md:h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:max-h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:w-screen max-md:max-w-none max-md:rounded-none",
      }}
    >
      <ModalContent
        className={`${modalContentClass} overflow-hidden max-md:h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:max-h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:w-screen max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:bg-gray-50 max-md:shadow-none`}
        style={modalContentStyle}
      >
        {() => (
          <>
            <ModalHeader className={`flex flex-col gap-1 max-md:sticky max-md:top-0 max-md:z-20 max-md:border-b max-md:border-[var(--stocksense-brand-border)] max-md:bg-[var(--stocksense-brand-soft)] max-md:px-4 max-md:py-3 ${modalHeaderClass}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--stocksense-brand)]">
                  Search
                </span>
                <button
                  type="button"
                  aria-label="Close search"
                  onClick={onClose}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)] md:hidden"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
              <span className="hidden text-sm font-normal text-gray-500 md:block">
                Search item names across every location, area, and category.
              </span>
            </ModalHeader>

            <ModalBody className={`${modalBodyClass} flex flex-col space-y-4 max-md:bg-gray-50 max-md:px-4 max-md:!pb-4 max-md:pt-3`}>
              <Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search your home..."
                startContent={<FaSearch className="text-gray-400" />}
                endContent={
                  <div className="flex items-center gap-2">
                    {isSearching && (
                      <FaSpinner className="animate-spin text-gray-400" />
                    )}
                    <button
                      type="button"
                      aria-label="Voice search"
                      onClick={showVoiceSearchToast}
                      className="grid h-8 w-8 place-items-center rounded-full text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)]"
                    >
                      <FaMicrophone className="h-3.5 w-3.5" />
                    </button>
                  </div>
                }
                variant="bordered"
                radius="lg"
                classNames={modalInputClassNames}
              />

              {toastMessage && (
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
                  {toastMessage}
                </div>
              )}

              {recentSearches.length > 0 && (
                <div className="flex flex-wrap gap-2 overflow-visible">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setQuery(term)}
                      className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-[var(--stocksense-brand-border)] bg-white px-3 text-sm font-medium text-[var(--stocksense-brand)] shadow-sm"
                    >
                      <FaHistory className="h-3 w-3 shrink-0" />
                      <span className="min-w-0 truncate">{term}</span>
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {error}
                </div>
              )}

              <div className="min-h-[220px] flex-1 space-y-2 overflow-x-hidden max-md:min-h-0 max-md:pb-4">
                <AnimatePresence initial={false}>
                  {results.map((item) => {
                    const imageUrl = item.imageUrl;
                    const expirationLabel = formatExpirationDate(item.expirationDate);

                    return (
                      <motion.button
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        onClick={() => openResult(item)}
                        className="w-full min-w-0 overflow-hidden rounded-xl border border-stocksense-gray bg-white p-3 text-left shadow-sm transition hover:-translate-y-[1px] hover:bg-gray-50 hover:shadow-md"
                      >
                        <div className="flex min-w-0 items-center justify-between gap-3">
                          <div className="flex min-w-0 flex-1 gap-3">
                            {imageUrl ? (
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-gray-50">
                                <img
                                  src={imageUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-gray-200 bg-gray-50 text-[var(--stocksense-brand)]">
                                <FaBoxOpen className="h-5 w-5" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="min-w-0 truncate font-semibold text-gray-950">
                                  {item.name}
                                </span>
                              </div>

                              <div className="mt-1 grid gap-1 text-sm text-gray-600">
                                <span className="inline-flex min-w-0 items-start gap-2">
                                  <FaMapMarkerAlt className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--stocksense-brand)]" />
                                  <span className="min-w-0 truncate">
                                    {itemPath(item)}
                                  </span>
                                </span>
                                <span className="inline-flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                  <span className="inline-flex items-center gap-1">
                                    <FaBoxOpen className="h-3 w-3" />
                                    Qty: {item.quantity ?? 0}
                                  </span>
                                  {expirationLabel && (
                                    <span className="inline-flex items-center gap-1">
                                      <FaCalendarAlt className="h-3 w-3" />
                                      Expires {expirationLabel}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          <FaChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>

                {showEmptyState && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="grid min-h-[260px] place-items-center rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center shadow-sm"
                  >
                    <div className="max-w-xs">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-[var(--stocksense-brand)] shadow-sm">
                        <FaSearch className="h-5 w-5" />
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-gray-950">
                        No items found
                      </h3>
                      <p className="mt-1 text-sm leading-5 text-gray-600">
                        We couldn&apos;t find any items matching &quot;{trimmedQuery}&quot;
                      </p>
                      <Button
                        className="mt-4 min-h-11 rounded-2xl bg-[var(--stocksense-brand)] text-white"
                        onPress={openAddFromSearch}
                        startContent={<FaPlus />}
                      >
                        Add &quot;{trimmedQuery}&quot;
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </ModalBody>

            <ModalFooter className={`${modalFooterClass} max-md:hidden`}>
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
