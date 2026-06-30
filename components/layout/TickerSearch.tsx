"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TickerSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sym = value.trim().toUpperCase();
    if (/^[A-Z.\-]{1,10}$/.test(sym)) {
      router.push(`/stock/${sym}`);
      setValue("");
    }
  }

  return (
    <form onSubmit={submit} className="relative" role="search">
      <svg
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search ticker"
        aria-label="Search ticker"
        autoComplete="off"
        autoCapitalize="characters"
        className="h-9 w-32 rounded-lg border border-border bg-surface pl-8 pr-3 text-sm placeholder:text-muted focus-visible:w-44 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-40 sm:focus-visible:w-52"
      />
    </form>
  );
}
