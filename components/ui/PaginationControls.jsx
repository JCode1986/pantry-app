"use client";

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export default function PaginationControls({
  currentPage,
  totalPages,
  startItem,
  endItem,
  totalItems,
  onPrevious,
  onNext,
  isLoading = false,
}) {
  if (totalItems <= 0 || totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stocksense-gray bg-white px-4 py-3 text-sm text-gray-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        Showing <span className="font-semibold text-gray-800">{startItem}</span>
        {" - "}
        <span className="font-semibold text-gray-800">{endItem}</span>
        {" of "}
        <span className="font-semibold text-gray-800">{totalItems}</span>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage <= 1 || isLoading}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FaChevronLeft className="h-3 w-3" />
          Previous
        </button>
        <span className="min-w-[88px] text-center text-xs text-gray-500">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage >= totalPages || isLoading}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <FaChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
