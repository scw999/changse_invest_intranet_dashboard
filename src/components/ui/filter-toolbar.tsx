"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type FilterOption = {
  label: string;
  value: string;
};

type FilterToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: Array<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
  }>;
  onReset: () => void;
  className?: string;
};

export function FilterToolbar({
  searchValue,
  onSearchChange,
  filters,
  onReset,
  className,
}: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.78)] p-3.5 shadow-[0_16px_45px_rgba(16,29,46,0.05)] backdrop-blur-sm md:rounded-[28px] md:p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-[18px] border border-[var(--border-soft)] bg-white/70 px-3.5 py-3 md:rounded-[20px] md:px-4">
          <Search className="h-4 w-4 text-[var(--text-faint)]" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="제목, 요약, 해석, 메모를 검색하세요"
            className="w-full bg-transparent text-sm text-[var(--text-strong)] outline-none placeholder:text-[var(--text-faint)]"
          />
        </div>

        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(23,42,70,0.08)] px-3 py-2 text-xs font-semibold tracking-[0.16em] text-[var(--text-muted)]">
            <SlidersHorizontal className="h-4 w-4" />
            필터
          </div>
          {filters.map((filter) => (
            <label key={filter.label} className="w-full sm:min-w-[150px] sm:grow-0">
              <span className="mb-1 block text-xs font-semibold tracking-[0.14em] text-[var(--text-faint)] uppercase">
                {filter.label}
              </span>
              <select
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
                className="w-full rounded-[18px] border border-[var(--border-soft)] bg-white/80 px-3 py-3 text-sm text-[var(--text-strong)] outline-none"
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <button
            type="button"
            onClick={onReset}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)] sm:w-auto"
          >
            <X className="h-4 w-4" />
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}
