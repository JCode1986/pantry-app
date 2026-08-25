'use client';

import { FaSearch } from 'react-icons/fa';

export default function StorageAreaSearchInput({
  value,
  onChange,
  placeholder,
  className = '',
}) {
  return (
    <label
      className={`flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 shadow-sm transition focus-within:border-[var(--stocksense-brand)] focus-within:ring-1 focus-within:ring-[var(--stocksense-brand-border)] ${className}`}
    >
      <FaSearch className="h-4 w-4 shrink-0 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
      />
    </label>
  );
}
