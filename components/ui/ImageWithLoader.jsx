"use client";

import { useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";

export default function ImageWithLoader({
  src,
  alt = "",
  className = "h-full w-full object-cover",
  loaderClassName = "",
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
  }, [src]);

  return (
    <span className="relative block h-full w-full">
      {src && !isLoaded ? (
        <span
          className={`absolute inset-0 z-10 grid place-items-center bg-white/70 text-[var(--stocksense-brand)] ${loaderClassName}`}
        >
          <FaSpinner className="h-4 w-4 animate-spin" />
        </span>
      ) : null}
      <img
        src={src}
        alt={alt}
        {...props}
        className={`${className} transition-opacity duration-200 ${
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
