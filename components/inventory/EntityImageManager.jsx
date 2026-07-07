"use client";

import { useRef, useState } from "react";
import { Button } from "@heroui/react";
import { FaCamera, FaImage, FaSpinner, FaTrash, FaUpload } from "react-icons/fa";
import {
  removeInventoryImage,
  uploadInventoryImage,
} from "@/app/actions/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function EntityImageManager({
  entityType,
  entityId,
  imageUrl,
  label = "Photo",
  onChange,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const displayLabel = /optional/i.test(label) ? label : `${label} optional`;

  const uploadImage = async (file) => {
    if (!file || !entityType || !entityId) return;

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Images must be 5 MB or smaller.");
      return;
    }

    setIsWorking(true);
    setError("");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const result = await uploadInventoryImage(entityType, entityId, formData);

      if (result?.error) {
        setError(typeof result.error === "string" ? result.error : "Could not upload image.");
        return;
      }

      onChange?.(result.data);
    } catch (err) {
      console.error("uploadInventoryImage request error:", err);
      setError(
        err?.message === "aborted"
          ? "The upload was interrupted. Try a smaller image or choose it again."
          : "Could not upload image."
      );
    } finally {
      setIsWorking(false);
    }
  };

  const removeImage = async () => {
    if (!entityType || !entityId) return;

    setIsWorking(true);
    setError("");

    const result = await removeInventoryImage(entityType, entityId);
    setIsWorking(false);

    if (result?.error) {
      setError(typeof result.error === "string" ? result.error : "Could not remove image.");
      return;
    }

    onChange?.(result.data);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 max-md:bg-white">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <FaImage className="h-3.5 w-3.5 text-[var(--stocksense-brand)]" />
          {displayLabel}
        </div>
        {isWorking && <FaSpinner className="h-3.5 w-3.5 animate-spin text-gray-400" />}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-32 sm:w-44">
          {imageUrl ? (
            <img
              src={imageUrl}
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              uploadImage(file);
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
              uploadImage(file);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="flat"
              className="min-h-10 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] sm:hidden"
              isDisabled={isWorking || !entityId}
              onPress={() => cameraInputRef.current?.click()}
              startContent={<FaCamera className="h-3.5 w-3.5" />}
            >
              Take photo
            </Button>
            <Button
              size="sm"
              variant="flat"
              className="min-h-10 rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)]"
              isDisabled={isWorking || !entityId}
              onPress={() => fileInputRef.current?.click()}
              startContent={<FaUpload className="h-3.5 w-3.5" />}
            >
              {imageUrl ? "Change photo" : "Add photo"}
            </Button>
            {imageUrl && (
              <Button
                size="sm"
                variant="flat"
                className="min-h-10 rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                isDisabled={isWorking}
                onPress={removeImage}
                startContent={<FaTrash className="h-3.5 w-3.5" />}
              >
                Remove photo
              </Button>
            )}
          </div>
          <p className="text-xs leading-5 text-gray-500 max-md:hidden">
            Take a photo or choose one from your camera roll. Max 5 MB.
          </p>
          {error && <p className="text-xs text-rose-700">{error}</p>}
        </div>
      </div>
    </div>
  );
}
