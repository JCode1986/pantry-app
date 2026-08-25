'use client';

import { useEffect, useRef, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';

const buttonBaseClass =
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

export default function InlinePendingButton({
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
}) {
  const [isPending, setIsPending] = useState(false);
  const mountedRef = useRef(false);
  const isDisabled = disabled || isPending;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isPending || undefined}
      onClick={(event) => {
        if (isDisabled) {
          event.preventDefault();
          return;
        }

        const result = onClick?.(event);
        if (result && typeof result.then === 'function') {
          setIsPending(true);
          Promise.resolve(result)
            .finally(() => {
              if (mountedRef.current) setIsPending(false);
            })
            .catch(() => {});
        }
      }}
      className={`${buttonBaseClass} ${className}`}
    >
      {isPending ? <FaSpinner className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
