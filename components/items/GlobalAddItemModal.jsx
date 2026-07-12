"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Button,
  DatePicker,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import {
  FaBarcode,
  FaCamera,
  FaCheckCircle,
  FaChevronDown,
  FaImage,
  FaMapMarkerAlt,
  FaMicrophone,
  FaPlus,
  FaSearch,
  FaSpinner,
  FaTags,
  FaTimes,
  FaTrash,
  FaUpload,
  FaWarehouse,
} from "react-icons/fa";
import {
  addItemWithPath,
  getInventoryHierarchy,
  lookupProductByBarcode,
  parseQuickAddVoiceText,
  uploadInventoryImage,
} from "@/app/actions/server";
import { toNonNegativeInteger } from "@/utils/pantry/date";
import { emitItemAdded } from "@/utils/clientEvents";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalHeaderClass,
  modalInputClassNames,
  themedSelectClassNames,
} from "@/components/modals/modalTheme";
import BarcodeScannerModal from "@/components/items/BarcodeScannerModal";
import QuantityStepperInput from "@/components/modals/QuantityStepperInput";

const NEW_VALUE = "__new__";
const EMPTY_LIST = [];
const ITEM_IMAGE_ENTITY = "item";
const ADD_METHOD_STORAGE_KEY = "wherekeep:add-item-method";
const KEEP_ADDING_STORAGE_KEY = "wherekeep:keep-adding-items";
const ADD_METHODS = [
  { id: "barcode", label: "Barcode", icon: FaBarcode },
  { id: "voice", label: "Voice", icon: FaMicrophone },
  { id: "manual", label: "Manual", icon: FaPlus },
];
const revealTransition = { duration: 0.2, ease: "easeOut" };
const revealMotion = {
  initial: { opacity: 0, height: 0, y: -6 },
  animate: { opacity: 1, height: "auto", y: 0 },
  exit: { opacity: 0, height: 0, y: -6 },
  transition: revealTransition,
};

const emptyForm = {
  locationName: "",
  storageAreaName: "",
  categoryName: "",
  itemName: "",
  barcode: "",
  quantity: "1",
  expirationDate: "",
};

const emptyItemFields = {
  itemName: "",
  barcode: "",
  quantity: "1",
  expirationDate: "",
};

const emptyValidationErrors = {
  locationName: "",
  storageAreaName: "",
  categoryName: "",
  itemName: "",
};

const invalidInputWrapperClass =
  "data-[invalid=true]:border-rose-500 data-[invalid=true]:bg-rose-50/40 focus-within:data-[invalid=true]:border-rose-500";

const invalidSelectTriggerClass =
  "data-[invalid=true]:border-rose-500 data-[invalid=true]:bg-rose-50/40 data-[invalid=true]:text-rose-700";

function getModalInputClassNames(isInvalid = false) {
  return {
    ...modalInputClassNames,
    inputWrapper: `${modalInputClassNames.inputWrapper} ${
      isInvalid ? invalidInputWrapperClass : ""
    }`,
  };
}

function getThemedSelectClassNames(isInvalid = false) {
  return {
    ...themedSelectClassNames,
    trigger: `${themedSelectClassNames.trigger} ${
      isInvalid ? invalidSelectTriggerClass : ""
    }`,
  };
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function cleanBarcode(value) {
  return typeof value === "string"
    ? value.trim().replace(/[^0-9A-Za-z._-]/g, "").slice(0, 80)
    : "";
}

function validateImageFile(file) {
  if (!file) return "";
  if (!IMAGE_TYPES.has(file.type)) {
    return "Choose a JPG, PNG, WebP, or GIF image.";
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return "Images must be 5 MB or smaller.";
  }
  return "";
}

function byId(items, id) {
  return (items ?? []).find((item) => String(item.id) === String(id)) ?? null;
}

function normalizeMatchName(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function byName(items, name) {
  const target = normalizeMatchName(name);
  if (!target) return null;
  return (
    (items ?? []).find((item) => normalizeMatchName(item?.name) === target) ?? null
  );
}

function readStoredAddMethod() {
  if (typeof window === "undefined") return "barcode";
  const storedMethod = window.localStorage.getItem(ADD_METHOD_STORAGE_KEY);
  return ADD_METHODS.some((method) => method.id === storedMethod)
    ? storedMethod
    : "barcode";
}

function readStoredKeepAdding() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEEP_ADDING_STORAGE_KEY) !== "false";
}

function AddItemMessage({ message, upgradeHref, onLinkClick, className = "" }) {
  if (!message) return null;

  return (
    <motion.div
      layout
      {...revealMotion}
      role="alert"
      aria-live="polite"
      className={`overflow-hidden rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 ${className}`}
    >
      {message}
      {upgradeHref && (
        <Link
          href={upgradeHref}
          onClick={onLinkClick}
          className="ml-2 font-semibold underline underline-offset-2"
        >
          View plans
        </Link>
      )}
    </motion.div>
  );
}

function NewPathField({
  icon: Icon,
  title,
  label,
  value,
  onValueChange,
  placeholder,
  isDisabled,
  isInvalid = false,
  errorMessage = "",
}) {
  return (
    <motion.div
      layout
      {...revealMotion}
      className={`overflow-hidden rounded-xl border p-3 shadow-sm ${
        isInvalid
          ? "border-rose-200 bg-rose-50/60"
          : "border-gray-200 bg-gray-50/70"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--stocksense-brand)] text-white">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-semibold text-gray-900">{title}</span>
      </div>
      <Input
        label={label}
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        errorMessage={errorMessage}
        variant="bordered"
        radius="lg"
        classNames={{
          ...getModalInputClassNames(isInvalid),
          inputWrapper:
            `border-gray-200 bg-white shadow-none focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)] ${
              isInvalid ? invalidInputWrapperClass : ""
            }`,
        }}
      />
    </motion.div>
  );
}

function getDefaultSelection(locations, context) {
  const preferredLocationId = context?.locationId
    ? String(context.locationId)
    : null;
  const location =
    (preferredLocationId
      ? locations.find((item) => String(item.id) === preferredLocationId)
      : null) ??
    locations[0] ??
    null;

  const storageAreas = location?.storageAreas ?? EMPTY_LIST;
  const preferredStorageAreaId = context?.storageAreaId
    ? String(context.storageAreaId)
    : null;
  const storageArea =
    (preferredStorageAreaId
      ? storageAreas.find((item) => String(item.id) === preferredStorageAreaId)
      : null) ??
    storageAreas[0] ??
    null;

  const categories = storageArea?.categories ?? EMPTY_LIST;
  const preferredCategoryId = context?.categoryId
    ? String(context.categoryId)
    : null;
  const category =
    (preferredCategoryId
      ? categories.find((item) => String(item.id) === preferredCategoryId)
      : null) ??
    categories[0] ??
    null;

  return {
    locationId: location?.id ?? NEW_VALUE,
    storageAreaId: storageArea?.id ?? NEW_VALUE,
    categoryId: category?.id ?? NEW_VALUE,
  };
}

export default function GlobalAddItemModal({ isOpen, onClose, onAdded, initialContext }) {
  const router = useRouter();
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(NEW_VALUE);
  const [storageAreaId, setStorageAreaId] = useState(NEW_VALUE);
  const [categoryId, setCategoryId] = useState(NEW_VALUE);
  const [form, setForm] = useState(emptyForm);
  const [validationErrors, setValidationErrors] = useState(emptyValidationErrors);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [upgradeHref, setUpgradeHref] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [autoStartBarcodeScanner, setAutoStartBarcodeScanner] = useState(false);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [barcodeMessage, setBarcodeMessage] = useState("");
  const [productPreview, setProductPreview] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  const [isBarcodeExpanded, setIsBarcodeExpanded] = useState(true);
  const [quickAddMessage, setQuickAddMessage] = useState("");
  const [quickAddTranscript, setQuickAddTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isParsingVoice, setIsParsingVoice] = useState(false);
  const [mobileAddedToast, setMobileAddedToast] = useState(null);
  const [addMethod, setAddMethod] = useState(readStoredAddMethod);
  const [keepAdding, setKeepAdding] = useState(readStoredKeepAdding);

  const selectedLocation = useMemo(
    () => byId(locations, locationId),
    [locations, locationId]
  );

  const storageAreas = selectedLocation?.storageAreas ?? EMPTY_LIST;

  const selectedStorageArea = useMemo(
    () => byId(storageAreas, storageAreaId),
    [storageAreas, storageAreaId]
  );

  const categories = selectedStorageArea?.categories ?? EMPTY_LIST;
  const hasExistingLocations = locations.length > 0;
  const hasExistingStorageAreas = storageAreas.length > 0;
  const hasExistingCategories = categories.length > 0;
  const validationMessage =
    "Choose or create a location, storage area, and category before adding the item.";
  const isQuickAdding = isListening || isParsingVoice;
  const methodOrder = useMemo(() => {
    if (addMethod === "voice") {
      return {
        barcode: "order-20",
        voice: "order-10",
        manual: "order-30",
      };
    }

    if (addMethod === "manual") {
      return {
        barcode: "order-20",
        voice: "order-30",
        manual: "order-10",
      };
    }

    return {
      barcode: "order-10",
      voice: "order-20",
      manual: "order-30",
    };
  }, [addMethod]);
  const formExpirationDateValue = useMemo(() => {
    if (!form.expirationDate) return null;
    try {
      return parseDate(form.expirationDate);
    } catch {
      return null;
    }
  }, [form.expirationDate]);

  const savePreferredAddMethod = useCallback((method) => {
    if (!ADD_METHODS.some((item) => item.id === method)) return;
    setAddMethod(method);
    try {
      window.localStorage.setItem(ADD_METHOD_STORAGE_KEY, method);
    } catch {
      // Local storage is only a convenience for the add flow.
    }
  }, []);

  const updateKeepAdding = (value) => {
    setKeepAdding(value);
    try {
      window.localStorage.setItem(KEEP_ADDING_STORAGE_KEY, value ? "true" : "false");
    } catch {
      // Local storage is only a convenience for the add flow.
    }
  };

  const getValidationErrors = useCallback(
    ({
      nextLocationId = locationId,
      nextStorageAreaId = storageAreaId,
      nextCategoryId = categoryId,
      nextForm = form,
    } = {}) => ({
      ...emptyValidationErrors,
      locationName:
        nextLocationId === NEW_VALUE && !nextForm.locationName.trim()
          ? "Location is required."
          : "",
      storageAreaName:
        nextStorageAreaId === NEW_VALUE && !nextForm.storageAreaName.trim()
          ? "Storage area is required."
          : "",
      categoryName:
        nextCategoryId === NEW_VALUE && !nextForm.categoryName.trim()
          ? "Category is required."
          : "",
      itemName: !nextForm.itemName.trim() ? "Item name is required." : "",
    }),
    [categoryId, form, locationId, storageAreaId]
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadHierarchy = async () => {
      setIsLoading(true);
      setMessage("");
      setUpgradeHref("");
      setValidationErrors(emptyValidationErrors);
      setForm((prev) => ({
        ...prev,
        itemName:
          typeof initialContext?.itemName === "string"
            ? initialContext.itemName.trim()
            : "",
      }));

      const result = await getInventoryHierarchy();
      if (cancelled) return;

      if (result?.error) {
        setMessage(result.error);
        setLocations([]);
        setLocationId(NEW_VALUE);
        setStorageAreaId(NEW_VALUE);
        setCategoryId(NEW_VALUE);
      } else {
        const nextLocations = result?.data ?? [];
        const selection = getDefaultSelection(nextLocations, initialContext);

        setLocations(nextLocations);
        setLocationId(selection.locationId);
        setStorageAreaId(selection.storageAreaId);
        setCategoryId(selection.categoryId);
      }

      setIsLoading(false);
    };

    loadHierarchy();

    return () => {
      cancelled = true;
    };
  }, [initialContext, isOpen]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.abort?.();
      speechRecognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const hasVisibleValidationErrors = Object.values(validationErrors).some(Boolean);
    const nextValidationErrors = getValidationErrors();
    const hasCurrentValidationErrors = Object.values(nextValidationErrors).some(Boolean);
    const hasCurrentDestinationErrors = Boolean(
      nextValidationErrors.locationName ||
        nextValidationErrors.storageAreaName ||
        nextValidationErrors.categoryName
    );

    if (hasVisibleValidationErrors && !hasCurrentValidationErrors) {
      setValidationErrors(emptyValidationErrors);
    }

    if (
      (message === validationMessage && !hasCurrentDestinationErrors) ||
      (message === "Complete the highlighted required fields." && !hasCurrentValidationErrors)
    ) {
      setMessage("");
    }
  }, [getValidationErrors, message, validationErrors, validationMessage]);

  const clearSelectedImage = () => {
    setSelectedImageFile(null);
    setSelectedImagePreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
    setImageMessage("");
  };

  const selectImageFile = (file) => {
    if (!file) return false;

    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setImageMessage(validationMessage);
      return false;
    }

    setSelectedImageFile(file);
    setImageMessage("");
    setSelectedImagePreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    return true;
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key] && String(value).trim()) {
      setValidationErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const updateBarcode = (value) => {
    savePreferredAddMethod("barcode");
    const barcode = cleanBarcode(value);
    setForm((prev) => ({ ...prev, barcode }));
    setBarcodeMessage("");
    if (barcode !== productPreview?.barcode) {
      setProductPreview(null);
    }
  };

  const openBarcodeScanner = (autoStart = false) => {
    savePreferredAddMethod("barcode");
    setAutoStartBarcodeScanner(Boolean(autoStart));
    setIsScannerOpen(true);
  };

  const handleScannerOpenChange = (open) => {
    setIsScannerOpen(open);
    if (!open) setAutoStartBarcodeScanner(false);
  };

  const applyQuickAddFields = (fields, sourceLabel) => {
    if (!fields) return;

    const nextItemName =
      typeof fields.itemName === "string" ? fields.itemName.trim() : "";
    const nextBarcode = cleanBarcode(fields.barcode);
    const hasQuantity = fields.quantity !== null && fields.quantity !== undefined;
    const nextQuantity = hasQuantity && Number.isFinite(Number(fields.quantity))
      ? String(Math.max(0, Math.min(9999, Math.round(Number(fields.quantity)))))
      : "";
    const nextExpirationDate =
      typeof fields.expirationDate === "string" ? fields.expirationDate.trim() : "";
    const nextLocationName =
      typeof fields.locationName === "string" ? fields.locationName.trim() : "";
    const nextStorageAreaName =
      typeof fields.storageAreaName === "string"
        ? fields.storageAreaName.trim()
        : "";
    const nextCategoryName =
      typeof fields.categoryName === "string" ? fields.categoryName.trim() : "";

    let nextLocationId = locationId;
    let nextStorageAreaId = storageAreaId;
    let nextCategoryId = categoryId;
    let nextLocation = selectedLocation;
    let nextStorageArea = selectedStorageArea;
    const destinationPatch = {};

    if (nextLocationName) {
      const matchedLocation = byName(locations, nextLocationName);
      if (matchedLocation) {
        nextLocationId = matchedLocation.id;
        nextLocation = matchedLocation;
        nextStorageArea = matchedLocation.storageAreas?.[0] ?? null;
        nextStorageAreaId = nextStorageArea?.id ?? NEW_VALUE;
        nextCategoryId = nextStorageArea?.categories?.[0]?.id ?? NEW_VALUE;
        destinationPatch.locationName = "";
        destinationPatch.storageAreaName = "";
        destinationPatch.categoryName = "";
      } else {
        nextLocationId = NEW_VALUE;
        nextStorageAreaId = NEW_VALUE;
        nextCategoryId = NEW_VALUE;
        nextLocation = null;
        nextStorageArea = null;
        destinationPatch.locationName = nextLocationName;
      }
    }

    if (nextStorageAreaName) {
      const matchedStorageArea = byName(
        nextLocation?.storageAreas ?? EMPTY_LIST,
        nextStorageAreaName
      );
      if (matchedStorageArea) {
        nextStorageAreaId = matchedStorageArea.id;
        nextStorageArea = matchedStorageArea;
        nextCategoryId = matchedStorageArea.categories?.[0]?.id ?? NEW_VALUE;
        destinationPatch.storageAreaName = "";
        destinationPatch.categoryName = "";
      } else {
        nextStorageAreaId = NEW_VALUE;
        nextCategoryId = NEW_VALUE;
        nextStorageArea = null;
        destinationPatch.storageAreaName = nextStorageAreaName;
      }
    }

    if (nextCategoryName) {
      const matchedCategory = byName(
        nextStorageArea?.categories ?? EMPTY_LIST,
        nextCategoryName
      );
      if (matchedCategory) {
        nextCategoryId = matchedCategory.id;
        destinationPatch.categoryName = "";
      } else {
        nextCategoryId = NEW_VALUE;
        destinationPatch.categoryName = nextCategoryName;
      }
    }

    setLocationId(nextLocationId);
    setStorageAreaId(nextStorageAreaId);
    setCategoryId(nextCategoryId);
    setProductPreview(null);
    setMessage("");
    setUpgradeHref("");
    setMobileAddedToast(null);

    if (nextBarcode) {
      setBarcodeMessage("");
      setIsBarcodeExpanded(true);
    }

    setForm((prev) => ({
      ...prev,
      ...destinationPatch,
      ...(nextItemName ? { itemName: nextItemName } : null),
      ...(nextQuantity ? { quantity: nextQuantity } : null),
      ...(nextExpirationDate ? { expirationDate: nextExpirationDate } : null),
      ...(nextBarcode ? { barcode: nextBarcode } : null),
    }));

    setValidationErrors((prev) => ({
      ...prev,
      ...(nextItemName ? { itemName: "" } : null),
      ...(nextLocationName ? { locationName: "" } : null),
      ...(nextStorageAreaName ? { storageAreaName: "" } : null),
      ...(nextCategoryName ? { categoryName: "" } : null),
    }));

    setQuickAddMessage(`${sourceLabel} filled item details. Review before adding.`);
  };

  const handleVoiceQuickAdd = () => {
    if (isParsingVoice) return;
    savePreferredAddMethod("voice");

    if (isListening) {
      speechRecognitionRef.current?.stop?.();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setQuickAddMessage("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    let didReceiveResult = false;
    let hadError = false;

    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setQuickAddTranscript("");
      setQuickAddMessage("Listening...");
    };

    recognition.onerror = (event) => {
      hadError = true;
      setIsListening(false);
      setIsParsingVoice(false);
      setQuickAddMessage(
        event?.error === "not-allowed" || event?.error === "service-not-allowed"
          ? "Microphone access was blocked."
          : "Could not hear that. Try again."
      );
    };

    recognition.onend = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
      if (!didReceiveResult && !hadError) {
        setQuickAddMessage("No voice input heard. Try again.");
      }
    };

    recognition.onresult = async (event) => {
      didReceiveResult = true;
      const transcript = Array.from(event.results ?? [])
        .map((result) => result?.[0]?.transcript)
        .filter(Boolean)
        .join(" ")
        .trim();

      if (!transcript) {
        setQuickAddMessage("No voice input heard. Try again.");
        return;
      }

      setQuickAddTranscript(transcript);
      setQuickAddMessage("Parsing voice note...");
      setIsParsingVoice(true);

      try {
        const result = await parseQuickAddVoiceText(transcript);
        if (result?.error) {
          setQuickAddMessage(
            typeof result.error === "string"
              ? result.error
              : result.error?.message ?? "Voice quick add is unavailable right now."
          );
          return;
        }

        applyQuickAddFields(result?.data, "Voice");
      } catch (error) {
        console.error("parseQuickAddVoiceText error:", error);
        setQuickAddMessage("Voice quick add is unavailable right now.");
      } finally {
        setIsParsingVoice(false);
      }
    };

    speechRecognitionRef.current?.abort?.();
    speechRecognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error("speech recognition start error:", error);
      setIsListening(false);
      setQuickAddMessage("Could not start microphone.");
    }
  };

  const lookupBarcode = async (barcodeValue) => {
    savePreferredAddMethod("barcode");
    const barcode = cleanBarcode(barcodeValue ?? form.barcode);

    if (!barcode) {
      setIsBarcodeExpanded(true);
      setBarcodeMessage("Enter or scan a barcode first.");
      return;
    }

    setIsBarcodeExpanded(true);
    setIsScannerOpen(false);
    setAutoStartBarcodeScanner(false);
    setIsLookingUpBarcode(true);
    setBarcodeMessage("");
    setProductPreview(null);
    setForm((prev) => ({ ...prev, barcode }));

    let result;
    try {
      result = await lookupProductByBarcode(barcode);
    } catch (error) {
      console.error("lookupProductByBarcode error:", error);
      setBarcodeMessage("Product lookup is unavailable right now.");
      setIsLookingUpBarcode(false);
      return;
    }

    setIsLookingUpBarcode(false);

    if (result?.error) {
      setBarcodeMessage(
        typeof result.error === "string"
          ? result.error
          : result.error?.message ?? "Could not look up that barcode."
      );
      return;
    }

    const product = result?.data;
    if (!product?.found) {
      setBarcodeMessage("No product match found. You can still add it manually.");
      setValidationErrors((prev) => ({ ...prev, itemName: "Item name is required." }));
      return;
    }

    setProductPreview(product);
    const productName = typeof product.name === "string" ? product.name.trim() : "";
    setForm((prev) => ({
      ...prev,
      barcode: product.barcode || barcode,
      itemName: prev.itemName.trim() ? prev.itemName : productName || prev.itemName,
    }));
    if (productName) {
      setValidationErrors((prev) => ({ ...prev, itemName: "" }));
      setBarcodeMessage("Product details added.");
    } else {
      setValidationErrors((prev) => ({ ...prev, itemName: "Item name is required." }));
      setBarcodeMessage(
        "Barcode scanned, but no item name was found. Enter an item name below to add it."
      );
    }
  };

  const selectLocation = (value) => {
    const nextLocationId = String(value);
    const nextLocation = byId(locations, nextLocationId);
    const nextStorageArea = nextLocation?.storageAreas?.[0] ?? null;
    const nextCategory = nextStorageArea?.categories?.[0] ?? null;

    setLocationId(nextLocationId);
    setStorageAreaId(nextStorageArea?.id ?? NEW_VALUE);
    setCategoryId(nextCategory?.id ?? NEW_VALUE);
    setValidationErrors((prev) => ({
      ...prev,
      locationName: "",
      storageAreaName: "",
      categoryName: "",
    }));
  };

  const selectStorageArea = (value) => {
    const nextStorageAreaId = String(value);
    const nextStorageArea = byId(storageAreas, nextStorageAreaId);
    const nextCategory = nextStorageArea?.categories?.[0] ?? null;

    setStorageAreaId(nextStorageAreaId);
    setCategoryId(nextCategory?.id ?? NEW_VALUE);
    setValidationErrors((prev) => ({
      ...prev,
      storageAreaName: "",
      categoryName: "",
    }));
  };

  const handleClose = () => {
    if (isSaving) return;
    speechRecognitionRef.current?.abort?.();
    speechRecognitionRef.current = null;
    setForm(emptyForm);
    setMessage("");
    setValidationErrors(emptyValidationErrors);
    setUpgradeHref("");
    setBarcodeMessage("");
    setProductPreview(null);
    clearSelectedImage();
    setIsScannerOpen(false);
    setAutoStartBarcodeScanner(false);
    setIsBarcodeExpanded(true);
    setQuickAddMessage("");
    setQuickAddTranscript("");
    setIsListening(false);
    setIsParsingVoice(false);
    setMobileAddedToast(null);
    setIsLoading(true);
    onClose?.();
  };

  const handleSubmit = async ({ closeAfterAdd = false } = {}) => {
    setMessage("");

    const nextValidationErrors = getValidationErrors();

    const missingDestination =
      nextValidationErrors.locationName ||
      nextValidationErrors.storageAreaName ||
      nextValidationErrors.categoryName;
    const hasValidationErrors = Object.values(nextValidationErrors).some(Boolean);

    setValidationErrors(nextValidationErrors);

    if (hasValidationErrors) {
      setMessage(
        missingDestination
          ? validationMessage
          : "Complete the highlighted required fields."
      );
      return;
    }

    setIsSaving(true);

    let result;
    try {
      result = await addItemWithPath({
        locationId: locationId === NEW_VALUE ? null : locationId,
        locationName: form.locationName,
        storageAreaId: storageAreaId === NEW_VALUE ? null : storageAreaId,
        storageAreaName: form.storageAreaName,
        categoryId: categoryId === NEW_VALUE ? null : categoryId,
        categoryName: form.categoryName,
        itemName: form.itemName,
        barcode: form.barcode,
        productImageUrl: selectedImageFile ? null : productPreview?.imageUrl ?? null,
        quantity: toNonNegativeInteger(form.quantity, 0),
        expirationDate: form.expirationDate || null,
      });
    } catch (error) {
      console.error("addItemWithPath error:", error);
      setMessage("Could not add item.");
      setIsSaving(false);
      return;
    }

    if (result?.error) {
      setMessage(
        typeof result.error === "string"
          ? result.error
          : result.error?.message ?? "Could not add item."
      );
      setUpgradeHref(result.upgradeHref || "");
      setIsSaving(false);
      return;
    }

    let added = result.data;
    let imageUploadWarning = "";

    if (selectedImageFile && added?.id) {
      const formData = new FormData();
      formData.append("image", selectedImageFile);

      try {
        const imageResult = await uploadInventoryImage(
          ITEM_IMAGE_ENTITY,
          added.id,
          formData
        );

        if (imageResult?.error) {
          imageUploadWarning =
            typeof imageResult.error === "string"
              ? imageResult.error
              : "Item was added, but the photo could not be uploaded.";
        } else if (imageResult?.data) {
          added = {
            ...added,
            image_path: imageResult.data.imagePath ?? added.image_path,
            imageUrl: imageResult.data.imageUrl ?? added.imageUrl,
          };
        }
      } catch (error) {
        console.error("uploadInventoryImage after add error:", error);
        imageUploadWarning = "Item was added, but the photo could not be uploaded.";
      }
    }

    setIsSaving(false);

    setLocations((prev) => {
      const locationExists = prev.some(
        (location) => String(location.id) === String(added.locationId)
      );

      const nextLocations = locationExists
        ? prev.map((location) => {
            if (String(location.id) !== String(added.locationId)) return location;

            const areaExists = (location.storageAreas ?? []).some(
              (area) => String(area.id) === String(added.storageAreaId)
            );

            const nextAreas = areaExists
              ? (location.storageAreas ?? []).map((area) => {
                  if (String(area.id) !== String(added.storageAreaId)) return area;

                  const categoryExists = (area.categories ?? []).some(
                    (category) => String(category.id) === String(added.categoryId)
                  );

                  return {
                    ...area,
                    categories: categoryExists
                      ? area.categories
                      : [
                          ...(area.categories ?? []),
                          {
                            id: added.categoryId,
                            name: added.categoryName ?? "Category",
                          },
                        ].sort((a, b) => a.name.localeCompare(b.name)),
                  };
                })
              : [
                  ...(location.storageAreas ?? []),
                  {
                    id: added.storageAreaId,
                    name: added.storageAreaName ?? "Storage area",
                    categories: [
                      {
                        id: added.categoryId,
                        name: added.categoryName ?? "Category",
                      },
                    ],
                  },
                ].sort((a, b) => a.name.localeCompare(b.name));

            return {
              ...location,
              storageAreas: nextAreas,
            };
          })
        : [
            ...prev,
            {
              id: added.locationId,
              name: added.locationName ?? "Location",
              storageAreas: [
                {
                  id: added.storageAreaId,
                  name: added.storageAreaName ?? "Storage area",
                  categories: [
                    {
                      id: added.categoryId,
                      name: added.categoryName ?? "Category",
                    },
                  ],
                },
              ],
            },
          ].sort((a, b) => a.name.localeCompare(b.name));

      return nextLocations;
    });

    setLocationId(added.locationId ?? NEW_VALUE);
    setStorageAreaId(added.storageAreaId ?? NEW_VALUE);
    setCategoryId(added.categoryId ?? NEW_VALUE);

    emitItemAdded(added);

    const addedName = form.itemName.trim();
    const destination =
      categoryId === NEW_VALUE
        ? form.categoryName.trim()
        : categories.find((category) => String(category.id) === String(categoryId))
            ?.name;

    setForm((prev) => ({
      ...prev,
      locationName: "",
      storageAreaName: "",
      categoryName: "",
      ...emptyItemFields,
    }));
    const shouldCloseAfterAdd = (closeAfterAdd || !keepAdding) && !imageUploadWarning;

    setProductPreview(null);
    setBarcodeMessage("");
    setIsBarcodeExpanded(addMethod === "barcode");
    clearSelectedImage();
    setMessage(imageUploadWarning);
    setMobileAddedToast(
      shouldCloseAfterAdd
        ? null
        : {
            itemId: added.id,
            itemName: addedName,
            destinationName: destination || "inventory",
          }
    );
    onAdded?.({
      itemName: addedName,
      destinationName: destination || "inventory",
      itemId: added.id,
    });
    if (shouldCloseAfterAdd) {
      setIsLoading(true);
      onClose?.();
    }
    router.refresh();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        placement="center"
        size="3xl"
        scrollBehavior="inside"
        classNames={{
          wrapper: "max-md:items-stretch max-md:justify-stretch max-md:overflow-hidden max-md:p-0",
          base: "max-md:m-0 max-md:h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:max-h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:w-screen max-md:max-w-none max-md:rounded-none",
        }}
      >
        <ModalContent
          className={`${modalContentClass} max-md:h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:max-h-[var(--wherekeep-mobile-sheet-height,100svh)] max-md:w-screen max-md:max-w-none max-md:rounded-none max-md:border-0 max-md:bg-gray-50 max-md:shadow-none`}
          style={modalContentStyle}
        >
          {() => (
            <>
            <ModalHeader className={`flex flex-col gap-1 max-md:sticky max-md:top-0 max-md:z-20 max-md:px-4 max-md:py-3 ${modalHeaderClass}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--stocksense-brand)]">Add item</span>
                <div className="flex shrink-0 items-center gap-2 md:hidden">
                  <Button
                    size="sm"
                    className="h-10 rounded-full bg-[var(--stocksense-brand)] px-4 text-sm font-semibold text-white"
                    onPress={() => handleSubmit()}
                    isDisabled={isSaving || isLoading || isQuickAdding}
                    startContent={
                      isSaving ? <FaSpinner className="h-3.5 w-3.5 animate-spin" /> : <FaPlus className="h-3.5 w-3.5" />
                    }
                  >
                    {isSaving ? "Adding" : "Add"}
                  </Button>
                  <button
                    type="button"
                    aria-label="Close add item"
                    onClick={handleClose}
                    disabled={isSaving}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] transition hover:bg-[var(--stocksense-brand-soft)] disabled:opacity-50"
                  >
                    <FaTimes className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <span className="hidden text-sm font-normal text-gray-500 md:block">
                Choose where it belongs, or create the missing location, area, or category.
              </span>
            </ModalHeader>

            <ModalBody className={`min-h-[150px] space-y-4 pb-3 max-md:bg-gray-50 max-md:px-4 max-md:pb-5 max-md:pt-4 ${modalBodyClass}`}>
              <AnimatePresence initial={false}>
                <AddItemMessage
                  message={message}
                  upgradeHref={upgradeHref}
                  onLinkClick={handleClose}
                  className="hidden md:block"
                />
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={revealTransition}
                    className="flex min-h-[150px] items-center justify-center rounded-2xl border border-dashed border-stocksense-gray bg-gray-50 text-sm text-gray-500"
                  >
                    <FaSpinner className="mr-2 animate-spin" />
                    Loading inventory...
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={revealTransition}
                    className="flex min-w-0 flex-col gap-3 sm:gap-4"
                  >
                    <div className="order-0 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm md:hidden">
                      <div className="grid grid-cols-3 gap-1">
                        {ADD_METHODS.map((method) => {
                          const Icon = method.icon;
                          const isActive = addMethod === method.id;

                          return (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => {
                                savePreferredAddMethod(method.id);
                                if (method.id === "barcode") setIsBarcodeExpanded(true);
                              }}
                              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition ${
                                isActive
                                  ? "bg-[var(--stocksense-brand)] text-white shadow-sm"
                                  : "text-gray-600 hover:bg-gray-50"
                              }`}
                              aria-pressed={isActive}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span>{method.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <section className={`${methodOrder.voice} md:hidden`}>
                      <h2 className="mb-2 text-base font-semibold text-gray-950">
                        Quick add
                      </h2>
                      <div className="grid gap-3">
                        <button
                          type="button"
                          onClick={handleVoiceQuickAdd}
                          disabled={isParsingVoice || isSaving}
                          aria-busy={isListening || isParsingVoice}
                          className="flex min-h-20 w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-[var(--stocksense-brand-border)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--stocksense-brand)] text-white">
                            {isListening || isParsingVoice ? (
                              <FaSpinner className="h-5 w-5 animate-spin" />
                            ) : (
                              <FaMicrophone className="h-5 w-5" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-base font-semibold text-gray-950">
                              {isListening
                                ? "Listening..."
                                : isParsingVoice
                                ? "Parsing..."
                                : "Add by voice"}
                            </span>
                            <span className="mt-0.5 block text-sm text-gray-500">
                              {isListening
                                ? "Speak now"
                                : isParsingVoice
                                ? "Filling details"
                                : "Tell WhereKeep what to add"}
                            </span>
                          </span>
                        </button>
                      </div>
                      {quickAddMessage && (
                        <div className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
                          {quickAddMessage}
                        </div>
                      )}
                      {quickAddTranscript && (
                        <div className="mt-2 truncate text-xs text-gray-500">
                          Heard: {quickAddTranscript}
                        </div>
                      )}
                    </section>

                    <div className="order-40 rounded-2xl border border-stocksense-gray bg-gray-50/70 p-3 sm:bg-white md:order-10">
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-gray-950">
                          <span className="md:hidden">Where is it stored?</span>
                          <span className="hidden md:inline">Where it goes</span>
                        </div>
                        <div className="hidden text-xs text-gray-500 md:block">
                          Choose existing places or create the missing ones.
                        </div>
                      </div>

                      <motion.div layout className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <motion.div layout className="space-y-2">
                        {hasExistingLocations && (
                          <Select
                            label="Location"
                            selectedKeys={new Set([String(locationId)])}
                            onSelectionChange={(keys) => {
                              const value = Array.from(keys)[0];
                              if (value) selectLocation(value);
                            }}
                            isDisabled={isSaving}
                            isInvalid={Boolean(validationErrors.locationName)}
                            variant="bordered"
                            radius="lg"
                            classNames={getThemedSelectClassNames(
                              Boolean(validationErrors.locationName)
                            )}
                          >
                            {locations.map((location) => (
                              <SelectItem key={String(location.id)}>
                                {location.name}
                              </SelectItem>
                            ))}
                            <SelectItem key={NEW_VALUE}>+ New location</SelectItem>
                          </Select>
                        )}
                        <AnimatePresence initial={false}>
                          {locationId === NEW_VALUE && (
                            <NewPathField
                              icon={FaMapMarkerAlt}
                              title="Create location"
                              label="Location name"
                              value={form.locationName}
                              onValueChange={(value) => updateForm("locationName", value)}
                              placeholder="e.g., Home"
                              isDisabled={isSaving}
                              isInvalid={Boolean(validationErrors.locationName)}
                              errorMessage={validationErrors.locationName}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>

                      <motion.div layout className="space-y-2">
                        {hasExistingStorageAreas && (
                          <Select
                            label="Storage area"
                            selectedKeys={new Set([String(storageAreaId)])}
                            onSelectionChange={(keys) => {
                              const value = Array.from(keys)[0];
                              if (value) selectStorageArea(value);
                            }}
                            isDisabled={isSaving || locationId === NEW_VALUE}
                            isInvalid={Boolean(validationErrors.storageAreaName)}
                            variant="bordered"
                            radius="lg"
                            classNames={getThemedSelectClassNames(
                              Boolean(validationErrors.storageAreaName)
                            )}
                          >
                            {storageAreas.map((area) => (
                              <SelectItem key={String(area.id)}>
                                {area.name}
                              </SelectItem>
                            ))}
                            <SelectItem key={NEW_VALUE}>+ New storage area</SelectItem>
                          </Select>
                        )}
                        <AnimatePresence initial={false}>
                          {storageAreaId === NEW_VALUE && (
                            <NewPathField
                              icon={FaWarehouse}
                              title="Create storage area"
                              label="Storage area name"
                              value={form.storageAreaName}
                              onValueChange={(value) => updateForm("storageAreaName", value)}
                              placeholder="e.g., Kitchen pantry"
                              isDisabled={isSaving}
                              isInvalid={Boolean(validationErrors.storageAreaName)}
                              errorMessage={validationErrors.storageAreaName}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>

                      <motion.div layout className="space-y-2">
                        {hasExistingCategories && (
                          <Select
                            label="Category"
                            selectedKeys={new Set([String(categoryId)])}
                            onSelectionChange={(keys) => {
                              const value = Array.from(keys)[0];
                              if (value) {
                                setCategoryId(String(value));
                                setValidationErrors((prev) => ({
                                  ...prev,
                                  categoryName: "",
                                }));
                              }
                            }}
                            isDisabled={isSaving || storageAreaId === NEW_VALUE}
                            isInvalid={Boolean(validationErrors.categoryName)}
                            variant="bordered"
                            radius="lg"
                            classNames={getThemedSelectClassNames(
                              Boolean(validationErrors.categoryName)
                            )}
                          >
                            {categories.map((category) => (
                              <SelectItem key={String(category.id)}>
                                {category.name}
                              </SelectItem>
                            ))}
                            <SelectItem key={NEW_VALUE}>+ New category</SelectItem>
                          </Select>
                        )}
                        <AnimatePresence initial={false}>
                          {categoryId === NEW_VALUE && (
                            <NewPathField
                              icon={FaTags}
                              title="Create category"
                              label="Category name"
                              value={form.categoryName}
                              onValueChange={(value) => updateForm("categoryName", value)}
                              placeholder="e.g., Snacks or Shelf 1"
                              isDisabled={isSaving}
                              isInvalid={Boolean(validationErrors.categoryName)}
                              errorMessage={validationErrors.categoryName}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>
                      </motion.div>
                    </div>

                    <label className="order-[45] flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm md:hidden">
                      <span className="min-w-0">
                        <span className="block">Keep adding here</span>
                        <span className="block truncate text-xs font-normal text-gray-500">
                          Preserve this location and method
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={keepAdding}
                        onChange={(event) => updateKeepAdding(event.target.checked)}
                        className="h-5 w-5 shrink-0 rounded border-gray-300"
                      />
                    </label>

                    <div className={`${methodOrder.barcode} overflow-hidden rounded-2xl border border-[var(--stocksense-brand-border)] bg-white shadow-sm md:order-20 md:border-stocksense-gray md:p-3`}>
                      <button
                        type="button"
                        onClick={() => setIsBarcodeExpanded((value) => !value)}
                        className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-3 text-left md:hidden"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <FaBarcode className="h-4 w-4 shrink-0 text-[var(--stocksense-brand)]" />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-950">
                              Scan barcode
                            </span>
                            <span className="block truncate text-xs text-gray-500">
                              Fastest way to fill item details
                            </span>
                          </span>
                        </span>
                        <FaChevronDown
                          className={`h-4 w-4 shrink-0 text-[var(--stocksense-brand)] transition ${
                            isBarcodeExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <div className="mb-3 hidden md:block">
                        <div className="text-sm font-semibold text-gray-950">
                          Barcode (optional)
                        </div>
                        <div className="text-xs text-gray-500">
                          Skip this, or scan/enter a code to fill product details faster.
                        </div>
                      </div>

                      <div className={`${isBarcodeExpanded ? "block" : "hidden"} border-t border-gray-100 p-3 md:block md:border-t-0 md:p-0`}>
                      <Button
                        className="mb-3 min-h-12 w-full rounded-2xl bg-[var(--stocksense-brand)] text-base font-semibold text-white md:hidden"
                        onPress={() => {
                          openBarcodeScanner(true);
                        }}
                        isDisabled={isSaving || isLookingUpBarcode}
                        startContent={<FaBarcode />}
                      >
                        Scan barcode
                      </Button>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_190px]">
                        <Input
                          label="Barcode (optional)"
                          value={form.barcode}
                          onValueChange={updateBarcode}
                          placeholder="e.g., 012345678905"
                          isDisabled={isSaving || isLookingUpBarcode}
                          variant="bordered"
                          radius="lg"
                          startContent={<FaBarcode className="text-gray-400" />}
                          classNames={modalInputClassNames}
                        />
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-1">
                          <Button
                            className="hidden rounded-xl bg-[var(--stocksense-brand)] text-white md:inline-flex"
                            onPress={() => {
                              openBarcodeScanner(false);
                            }}
                            isDisabled={isSaving || isLookingUpBarcode}
                            startContent={<FaBarcode />}
                          >
                            Scan
                          </Button>
                          <Button
                            variant="flat"
                            className="min-h-11 rounded-xl"
                            onPress={() => lookupBarcode()}
                            isDisabled={isSaving || isLookingUpBarcode || !form.barcode}
                            startContent={
                              isLookingUpBarcode ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaSearch />
                              )
                            }
                          >
                            Lookup
                          </Button>
                        </div>
                      </div>

                      {(barcodeMessage || productPreview) && (
                        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3">
                          {productPreview ? (
                            <div className="flex items-center gap-3">
                              {productPreview.imageUrl && (
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-stocksense-gray bg-white">
                                  <img
                                    src={productPreview.imageUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                                  <FaCheckCircle className="h-3.5 w-3.5 shrink-0 text-[var(--stocksense-brand)]" />
                                  <span className="truncate">
                                    {productPreview.name || "Product found"}
                                  </span>
                                </div>
                                {barcodeMessage ? (
                                  <div className="mt-1 text-xs font-medium text-amber-700">
                                    {barcodeMessage}
                                  </div>
                                ) : null}
                                <div className="mt-0.5 text-xs text-gray-600">
                                  {[productPreview.brand, productPreview.barcode]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-700">
                              {barcodeMessage}
                            </div>
                          )}
                        </div>
                      )}
                      </div>
                    </div>

                    <div className={`${methodOrder.manual} rounded-2xl border border-stocksense-gray bg-white p-3 shadow-sm md:order-30`}>
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-gray-950">
                          Item details
                        </div>
                        <div className="text-xs text-gray-500">
                          Add the name now. Quantity and expiration can be updated later.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_180px]">
                        <Input
                          label="Item name"
                          value={form.itemName}
                          onValueChange={(value) => {
                            savePreferredAddMethod("manual");
                            updateForm("itemName", value);
                          }}
                          placeholder="e.g., Rice"
                          isDisabled={isSaving}
                          isInvalid={Boolean(validationErrors.itemName)}
                          errorMessage={validationErrors.itemName}
                          variant="bordered"
                          radius="lg"
                          classNames={getModalInputClassNames(
                            Boolean(validationErrors.itemName)
                          )}
                        />
                        <QuantityStepperInput
                          label="Quantity"
                          min={0}
                          value={form.quantity}
                          onValueChange={(value) => updateForm("quantity", value)}
                          isDisabled={isSaving}
                          classNames={modalInputClassNames}
                        />
                        <DatePicker
                          label="Expiration"
                          labelPlacement="inside"
                          value={formExpirationDateValue}
                          onChange={(date) =>
                            updateForm("expirationDate", date ? date.toString() : "")
                          }
                          isDisabled={isSaving}
                          variant="bordered"
                          radius="lg"
                          classNames={modalInputClassNames}
                          showMonthAndYearPickers
                        />
                      </div>

                      <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3">
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            selectImageFile(file);
                          }}
                        />
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            selectImageFile(file);
                          }}
                        />

                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
                            Item photo optional
                          </div>
                          {selectedImageFile && (
                            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--stocksense-brand)]">
                              Ready to upload
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-32 sm:w-44">
                            {selectedImagePreview || productPreview?.imageUrl ? (
                              <img
                                src={selectedImagePreview || productPreview.imageUrl}
                                alt=""
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-xs text-gray-400">
                                Optional photo
                              </div>
                            )}
                          </div>

                          <div className="flex flex-1 flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="flat"
                                className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] sm:hidden"
                                isDisabled={isSaving}
                                onPress={() => cameraInputRef.current?.click()}
                                startContent={<FaCamera className="h-3.5 w-3.5" />}
                              >
                                Take photo
                              </Button>
                              <Button
                                size="sm"
                                variant="flat"
                                className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                                isDisabled={isSaving}
                                onPress={() => imageInputRef.current?.click()}
                                startContent={<FaUpload className="h-3.5 w-3.5" />}
                              >
                                {selectedImageFile ? "Choose different" : "Choose image"}
                              </Button>
                              {selectedImageFile && (
                                <Button
                                  size="sm"
                                  variant="flat"
                                  className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                                  isDisabled={isSaving}
                                  onPress={clearSelectedImage}
                                  startContent={<FaTrash className="h-3.5 w-3.5" />}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                            <p className="text-xs leading-5 text-gray-500">
                              {selectedImageFile
                                ? selectedImageFile.name
                                : productPreview?.imageUrl
                                ? "Barcode lookup image will be used unless you choose your own."
                                : "Take a photo or choose one from your camera roll. Max 5 MB."}
                            </p>
                            {imageMessage && (
                              <p className="text-xs text-rose-700">{imageMessage}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </ModalBody>

            <ModalFooter
              className="wherekeep-modal-footer flex shrink-0 flex-col gap-2 border-t border-gray-200 bg-white max-md:sticky max-md:bottom-0 max-md:z-20 max-md:px-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:pt-3 max-md:shadow-[0_-12px_24px_rgb(15_23_42_/_0.08)] sm:flex-row sm:items-center sm:justify-end"
            >
              <AnimatePresence initial={false}>
                {mobileAddedToast && (
                  <motion.div
                    layout
                    {...revealMotion}
                    className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm md:hidden"
                  >
                    <div className="text-sm font-semibold text-gray-950">
                      Item added
                    </div>
                    <div className="mt-0.5 truncate text-xs text-gray-600">
                      {mobileAddedToast.itemName} was added to{" "}
                      {mobileAddedToast.destinationName}.
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
                        onPress={() => {
                          handleClose();
                        }}
                      >
                        Done
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                        onPress={() => {
                          setMobileAddedToast(null);
                          setMessage("");
                          if (addMethod === "barcode") {
                            setIsBarcodeExpanded(true);
                            openBarcodeScanner(true);
                          }
                          if (addMethod === "voice") {
                            handleVoiceQuickAdd();
                          }
                        }}
                      >
                        {addMethod === "barcode"
                          ? "Scan next"
                          : addMethod === "voice"
                          ? "Voice next"
                          : "Add another"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                <AddItemMessage
                  message={message}
                  upgradeHref={upgradeHref}
                  onLinkClick={handleClose}
                  className="w-full md:hidden"
                />
              </AnimatePresence>

              <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:justify-end">
                <Button variant="light" className="hidden rounded-xl md:inline-flex" onPress={handleClose} isDisabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  variant="flat"
                  className="hidden rounded-xl md:inline-flex"
                  onPress={() => handleSubmit({ closeAfterAdd: true })}
                  isDisabled={isSaving || isLoading || isQuickAdding}
                >
                  Add & close
                </Button>
                <Button
                  className="hidden min-h-12 rounded-2xl bg-[var(--stocksense-brand)] text-white md:inline-flex md:min-h-10 md:rounded-xl"
                  onPress={() => handleSubmit()}
                  isDisabled={isSaving || isLoading || isQuickAdding}
                  startContent={isSaving ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                >
                  {isSaving ? (
                    "Adding..."
                  ) : (
                    <>
                      <span className="md:hidden">
                        {keepAdding ? "Add item" : "Add item & done"}
                      </span>
                      <span className="hidden md:inline">Add another</span>
                    </>
                  )}
                </Button>
              </div>
            </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onOpenChange={handleScannerOpenChange}
        onScan={lookupBarcode}
        autoStart={autoStartBarcodeScanner}
      />
    </>
  );
}
