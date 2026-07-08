'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { FaClock, FaSignOutAlt, FaSpinner } from "react-icons/fa";
import { logoutAction, refreshTokenIfNeeded } from "@/app/actions/auth";
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_STORAGE_KEY,
  applyAppPreferences,
} from "@/utils/appPreferences";
import { useSession } from "@/lib/SessionContext";
import {
  modalBodyClass,
  modalContentClass,
  modalContentStyle,
  modalFooterClass,
  modalHeaderClass,
} from "@/components/modals/modalTheme";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_DURATION_MS = 2 * 60 * 1000;
const WARNING_START_MS = IDLE_TIMEOUT_MS - WARNING_DURATION_MS;
const WARNING_DURATION_SECONDS = Math.ceil(WARNING_DURATION_MS / 1000);
const ACTIVITY_BROADCAST_KEY = "wherekeep.lastActivityAt";
const ACTIVITY_THROTTLE_MS = 1000;

const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
];

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function resetLocalPreferences() {
  try {
    window.localStorage.removeItem(PREFERENCE_STORAGE_KEY);
  } catch {
    // Ignore storage failures while logging out.
  }

  applyAppPreferences(DEFAULT_PREFERENCES);
}

export default function InactivityLogout({ isAuthenticated: serverAuthenticated = false }) {
  const router = useRouter();
  const { session, loading } = useSession();
  const clientAuthenticated = Boolean(session?.access_token) && !loading;
  const isAuthenticated = serverAuthenticated || clientAuthenticated;

  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    WARNING_DURATION_SECONDS
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isStayingSignedIn, setIsStayingSignedIn] = useState(false);

  const lastActivityAtRef = useRef(lastActivityAt);
  const warningOpenRef = useRef(warningOpen);
  const loggingOutRef = useRef(false);

  const logoutAt = useMemo(
    () => lastActivityAt + IDLE_TIMEOUT_MS,
    [lastActivityAt]
  );

  const countdownLabel = formatCountdown(secondsRemaining);
  const countdownPercent = Math.max(
    0,
    Math.min(100, (secondsRemaining / WARNING_DURATION_SECONDS) * 100)
  );

  useEffect(() => {
    lastActivityAtRef.current = lastActivityAt;
  }, [lastActivityAt]);

  useEffect(() => {
    warningOpenRef.current = warningOpen;
  }, [warningOpen]);

  const broadcastActivity = useCallback((timestamp) => {
    try {
      window.localStorage.setItem(ACTIVITY_BROADCAST_KEY, String(timestamp));
    } catch {
      // Cross-tab sync is helpful, not required.
    }
  }, []);

  const markActive = useCallback(
    ({ broadcast = true, timestamp = Date.now() } = {}) => {
      if (loggingOutRef.current) return;

      setWarningOpen(false);
      setSecondsRemaining(WARNING_DURATION_SECONDS);
      setLastActivityAt(timestamp);

      if (broadcast) {
        broadcastActivity(timestamp);
      }
    },
    [broadcastActivity]
  );

  const performLogout = useCallback(async () => {
    if (loggingOutRef.current) return;

    loggingOutRef.current = true;
    setIsLoggingOut(true);
    setWarningOpen(true);

    try {
      resetLocalPreferences();
      const result = await logoutAction();
      window.location.href = result?.redirectTo || "/login";
    } catch (error) {
      console.error("Idle logout failed:", error);
      window.location.href = "/login";
    }
  }, []);

  const staySignedIn = useCallback(async () => {
    if (loggingOutRef.current || isStayingSignedIn) return;

    setIsStayingSignedIn(true);

    try {
      const result = await refreshTokenIfNeeded();

      if (result?.ok === false) {
        await performLogout();
        return;
      }

      markActive();
      router.refresh();
    } catch (error) {
      console.error("Session keepalive failed:", error);
      await performLogout();
    } finally {
      setIsStayingSignedIn(false);
    }
  }, [isStayingSignedIn, markActive, performLogout, router]);

  useEffect(() => {
    if (!isAuthenticated) {
      setWarningOpen(false);
      setIsLoggingOut(false);
      loggingOutRef.current = false;
      return;
    }

    markActive();
  }, [isAuthenticated, markActive, session?.access_token]);

  useEffect(() => {
    if (!isAuthenticated || loggingOutRef.current) return;

    const now = Date.now();
    const warningAt = lastActivityAt + WARNING_START_MS;
    const msUntilWarning = warningAt - now;
    const msUntilLogout = logoutAt - now;

    if (msUntilLogout <= 0) {
      performLogout();
      return;
    }

    let warningTimer = null;
    let logoutTimer = null;

    if (msUntilWarning <= 0) {
      setWarningOpen(true);
    } else {
      warningTimer = window.setTimeout(() => {
        setWarningOpen(true);
      }, msUntilWarning);
    }

    logoutTimer = window.setTimeout(() => {
      performLogout();
    }, msUntilLogout);

    return () => {
      if (warningTimer) window.clearTimeout(warningTimer);
      if (logoutTimer) window.clearTimeout(logoutTimer);
    };
  }, [isAuthenticated, lastActivityAt, logoutAt, performLogout]);

  useEffect(() => {
    if (!warningOpen || !isAuthenticated || loggingOutRef.current) return;

    const updateCountdown = () => {
      const nextSeconds = Math.ceil((logoutAt - Date.now()) / 1000);

      if (nextSeconds <= 0) {
        setSecondsRemaining(0);
        performLogout();
        return;
      }

      setSecondsRemaining(nextSeconds);
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, logoutAt, performLogout, warningOpen]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleActivity = () => {
      if (warningOpenRef.current || loggingOutRef.current) return;

      const now = Date.now();

      if (now - lastActivityAtRef.current < ACTIVITY_THROTTLE_MS) {
        return;
      }

      markActive({ timestamp: now });
    };

    const handleStorage = (event) => {
      if (
        event.key !== ACTIVITY_BROADCAST_KEY ||
        !event.newValue ||
        loggingOutRef.current
      ) {
        return;
      }

      const timestamp = Number(event.newValue);

      if (
        Number.isFinite(timestamp) &&
        timestamp > lastActivityAtRef.current
      ) {
        markActive({ broadcast: false, timestamp });
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    window.addEventListener("storage", handleStorage);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.removeEventListener("storage", handleStorage);
    };
  }, [isAuthenticated, markActive]);

  if (!isAuthenticated) return null;

  return (
    <Modal
      hideCloseButton
      isDismissable={false}
      isOpen={warningOpen}
      placement="center"
      classNames={{
        wrapper: "max-md:items-end",
        base: "max-md:m-0 max-md:w-screen max-md:max-w-none max-md:rounded-b-none max-md:rounded-t-2xl",
      }}
    >
      <ModalContent
        className={`${modalContentClass} max-md:h-auto max-md:max-h-[85svh] max-md:rounded-b-none max-md:rounded-t-2xl max-md:border max-md:border-gray-200 max-md:bg-white max-md:shadow-2xl`}
        style={modalContentStyle}
      >
        <ModalHeader className={`flex flex-col gap-1 ${modalHeaderClass}`}>
          Session timeout
        </ModalHeader>
        <ModalBody className={`space-y-4 ${modalBodyClass}`}>
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <FaClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                You have been inactive for a while.
              </p>
              <p className="mt-1 text-sm text-gray-600">
                For your account security, WhereKeep will log you out soon.
              </p>
            </div>
          </div>

          <div
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-amber-900">
                Time remaining
              </span>
              <span className="font-mono text-base font-semibold text-amber-900">
                {countdownLabel}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100">
              <div
                className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
                style={{ width: `${countdownPercent}%` }}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter className={modalFooterClass}>
          <Button
            variant="light"
            className="rounded-xl text-rose-700"
            onPress={performLogout}
            isDisabled={isLoggingOut || isStayingSignedIn}
            startContent={
              isLoggingOut ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaSignOutAlt />
              )
            }
          >
            {isLoggingOut ? "Logging out..." : "Log out"}
          </Button>
          <Button
            className="rounded-xl bg-[var(--stocksense-brand)] text-white"
            onPress={staySignedIn}
            isDisabled={isLoggingOut || isStayingSignedIn}
            startContent={
              isStayingSignedIn ? <FaSpinner className="animate-spin" /> : null
            }
          >
            {isStayingSignedIn ? "Staying signed in..." : "Stay signed in"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
