"use client";

import { useEffect, useRef, useState } from "react";
import { FaSpinner } from "react-icons/fa";

export default function ImageWithLoader({
  src,
  alt = "",
  className = "h-full w-full object-cover",
  loaderClassName = "",
  wrapperClassName = "",
  onLoad,
  onError,
  ...props
}) {
  const imageRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(!src);

  useEffect(() => {
    if (!src) {
      setIsLoaded(true);
      return undefined;
    }

    let isActive = true;
    const image = imageRef.current;

    setIsLoaded(false);

    if (image?.complete) {
      setIsLoaded(true);
      return () => {
        isActive = false;
      };
    }

    const fallbackTimer = window.setTimeout(() => {
      if (isActive) {
        setIsLoaded(true);
      }
    }, 15000);

    return () => {
      isActive = false;
      window.clearTimeout(fallbackTimer);
    };
  }, [src]);

  return (
    <span
      className={`relative block h-full w-full overflow-hidden rounded-[inherit] ${wrapperClassName}`}
    >
      {src && !isLoaded ? (
        <span
          aria-hidden="true"
          className={`absolute inset-0 z-10 flex h-full w-full items-center justify-center bg-white/70 text-[var(--stocksense-brand)] ${loaderClassName}`}
        >
          <FaSpinner className="block h-4 w-4 animate-spin" />
        </span>
      ) : null}
      {src ? (
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          {...props}
          className={`block ${className} transition-opacity duration-200 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={(event) => {
            setIsLoaded(true);
            onLoad?.(event);
          }}
          onError={(event) => {
            setIsLoaded(true);
            onError?.(event);
          }}
        />
      ) : null}
    </span>
  );
}
