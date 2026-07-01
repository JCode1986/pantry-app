"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { FaBarcode, FaCamera, FaImage, FaSpinner, FaStop } from "react-icons/fa";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
  modalInputClassNames,
} from "@/components/modals/modalTheme";

const BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
];

function cleanBarcode(value) {
  return typeof value === "string"
    ? value.trim().replace(/[^0-9A-Za-z._-]/g, "").slice(0, 80)
    : "";
}

export default function BarcodeScannerModal({ isOpen, onOpenChange, onScan }) {
  const videoRef = useRef(null);
  const photoInputRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const frameRef = useRef(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [message, setMessage] = useState("");
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasNativeDetector, setHasNativeDetector] = useState(false);

  useEffect(() => {
    setHasNativeDetector(
      typeof window !== "undefined" &&
        "BarcodeDetector" in window &&
        Boolean(navigator?.mediaDevices?.getUserMedia)
    );
  }, []);

  const stopCamera = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setIsStartingCamera(false);
  };

  useEffect(() => {
    if (!isOpen) stopCamera();
    return stopCamera;
  }, [isOpen]);

  const emitScan = (value) => {
    const barcode = cleanBarcode(value);
    if (!barcode) return;
    stopCamera();
    setManualBarcode(barcode);
    setMessage("");
    onScan?.(barcode);
  };

  const getDetector = () => {
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) return null;
    if (detectorRef.current) return detectorRef.current;

    try {
      detectorRef.current = new window.BarcodeDetector({ formats: BARCODE_FORMATS });
    } catch {
      detectorRef.current = new window.BarcodeDetector();
    }

    return detectorRef.current;
  };

  const scanFrame = async () => {
    const detector = getDetector();
    const video = videoRef.current;

    if (!detector || !video || !streamRef.current) return;

    try {
      if (video.readyState >= 2) {
        const codes = await detector.detect(video);
        const barcode = codes?.[0]?.rawValue;
        if (barcode) {
          emitScan(barcode);
          return;
        }
      }
    } catch {
      setMessage("Could not read a barcode from the camera yet.");
    }

    frameRef.current = requestAnimationFrame(scanFrame);
  };

  const startCamera = async () => {
    setMessage("");

    if (!hasNativeDetector) {
      setMessage("Camera scanning is not supported in this browser. Enter the barcode manually.");
      return;
    }

    setIsStartingCamera(true);

    try {
      const detector = getDetector();
      if (!detector) throw new Error("BarcodeDetector unavailable");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);
      setIsStartingCamera(false);
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      console.error("barcode camera error:", err);
      stopCamera();
      setMessage("Camera access was not available. Enter the barcode manually instead.");
    }
  };

  const scanPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setMessage("");

    const detector = getDetector();
    if (!detector || typeof createImageBitmap !== "function") {
      setMessage("Photo scanning is not supported in this browser.");
      return;
    }

    let bitmap = null;
    try {
      bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);
      const barcode = codes?.[0]?.rawValue;

      if (barcode) {
        emitScan(barcode);
      } else {
        setMessage("No barcode was found in that photo.");
      }
    } catch (err) {
      console.error("barcode photo error:", err);
      setMessage("Could not scan that photo.");
    } finally {
      bitmap?.close?.();
    }
  };

  const submitManualBarcode = () => {
    const barcode = cleanBarcode(manualBarcode);
    if (!barcode) {
      setMessage("Enter the barcode number first.");
      return;
    }

    emitScan(barcode);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) stopCamera();
        onOpenChange?.(open);
      }}
      placement="center"
      size="lg"
      scrollBehavior="inside"
    >
      <ModalContent className={modalContentClass} style={modalContentStyle}>
        {() => (
          <>
            <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
              <span className="text-[var(--stocksense-brand)]">Scan barcode</span>
              <span className="text-sm font-normal text-gray-500">
                Use the camera, choose a barcode photo, or enter the number.
              </span>
            </ModalHeader>

            <ModalBody className={`space-y-4 ${modalBodyClass}`}>
              {message && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {message}
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-stocksense-gray bg-gray-950">
                <video
                  ref={videoRef}
                  className="aspect-video w-full bg-gray-950 object-cover"
                  muted
                  playsInline
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  className="rounded-xl bg-[var(--stocksense-brand)] text-white"
                  onPress={isScanning ? stopCamera : startCamera}
                  startContent={
                    isStartingCamera ? (
                      <FaSpinner className="animate-spin" />
                    ) : isScanning ? (
                      <FaStop />
                    ) : (
                      <FaCamera />
                    )
                  }
                >
                  {isScanning ? "Stop camera" : "Start camera"}
                </Button>

                <Button
                  variant="flat"
                  className="rounded-xl"
                  onPress={() => photoInputRef.current?.click()}
                  startContent={<FaImage />}
                >
                  Choose photo
                </Button>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={scanPhoto}
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  label="Barcode"
                  value={manualBarcode}
                  onValueChange={setManualBarcode}
                  placeholder="012345678905"
                  variant="bordered"
                  radius="lg"
                  classNames={modalInputClassNames}
                />
                <Button
                  className="rounded-xl border border-[var(--stocksense-brand-border)] bg-white text-[var(--stocksense-brand)] sm:self-end"
                  onPress={submitManualBarcode}
                  startContent={<FaBarcode />}
                >
                  Use barcode
                </Button>
              </div>
            </ModalBody>

            <ModalFooter className={modalFooterClass}>
              <Button variant="light" className="rounded-xl" onPress={() => onOpenChange?.(false)}>
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
