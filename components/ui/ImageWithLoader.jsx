"use client";

import { useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";

export default function ImageWithLoader({
  src,
  alt = "",
  className = "h-full w-full object-cover",
  loaderClassName = "",
  wrapperClassName = "",
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
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
      <img
        src={src}
        alt={alt}
        {...props}
        className={`block ${className} transition-opacity duration-200 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={(event) => {
          setIsLoaded(true);
          props.onLoad?.(event);
        }}
        onError={(event) => {
          setIsLoaded(true);
          props.onError?.(event);
        }}
      />
    </span>
  );
}
