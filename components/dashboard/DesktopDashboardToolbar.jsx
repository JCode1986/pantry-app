"use client";

import { useEffect, useState } from "react";

export default function DesktopDashboardToolbar({
  greeting = "Good morning",
  userName = "there",
}) {
  const [preferredName, setPreferredName] = useState(userName);
  const displayName = preferredName || userName;

  useEffect(() => {
    setPreferredName(userName);
  }, [userName]);

  useEffect(() => {
    const handlePreferredNameChange = (event) => {
      setPreferredName(event.detail?.name?.trim() || "");
    };

    window.addEventListener(
      "wherekeep:preferred-name-change",
      handlePreferredNameChange
    );

    return () => {
      window.removeEventListener(
        "wherekeep:preferred-name-change",
        handlePreferredNameChange
      );
    };
  }, []);

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
          {greeting}, {displayName}
        </h1>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Here's what's happening in your home.
        </p>
      </div>
    </header>
  );
}
