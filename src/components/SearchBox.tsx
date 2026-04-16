"use client";

import { useMemo, useRef, useState } from "react";
import type { Venue } from "@/lib/types";

type Props = {
  venues: Venue[];
  onSelect: (venue: Venue) => void;
};

const MAX_RESULTS = 8;

export default function SearchBox({ venues, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const starts: Venue[] = [];
    const contains: Venue[] = [];
    for (const v of venues) {
      const n = v.name.toLowerCase();
      if (n.startsWith(q)) starts.push(v);
      else if (n.includes(q)) contains.push(v);
      if (starts.length + contains.length >= MAX_RESULTS * 3) break;
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [query, venues]);

  function handleSelect(v: Venue) {
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
    onSelect(v);
  }

  return (
    <div className="fixed z-20 top-3 left-3 right-3 md:left-4 md:right-auto md:w-[360px]">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so a click on a result can register before we close.
          window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setQuery("");
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        placeholder="Search venues…"
        className="w-full px-4 py-3 bg-white/95 backdrop-blur shadow-lg rounded-lg text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-black/10"
      />
      {open && results.length > 0 && (
        <ul className="mt-1 bg-white rounded-lg shadow-lg overflow-hidden max-h-[60vh] overflow-y-auto">
          {results.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // Don't blur the input before onClick fires.
                  e.preventDefault();
                  handleSelect(v);
                }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-100 border-b border-zinc-100 last:border-b-0"
              >
                <div className="font-medium text-zinc-900">{v.name}</div>
                {v.address && (
                  <div className="text-xs text-zinc-500 truncate">
                    {v.address}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
