import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { Provider } from "@/lib/livePrices";
import { MIN_QUERY, useSymbolSearch, type SymbolHit } from "@/lib/symbolSearch";

interface Props {
  provider: Provider;
  value: string;
  onChange: (value: string) => void;
  /** A result was chosen — the dialog uses it to fill the name too. */
  onPick?: (hit: SymbolHit) => void;
  placeholder?: string;
}

/**
 * A ticker / scheme-code box that also searches by name. Typing "reliance"
 * lists Reliance Industries (NSE) and friends; choosing one writes the
 * ticker the live-price path understands. Typing the code by hand still
 * works exactly as before — the search is a layer over the same field.
 */
export function SymbolPicker({ provider, value, onChange, onPick, placeholder }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // The picked value is a code, not a name: searching for it again would
  // only clutter the box, so the search tracks what was typed, not picked.
  const [query, setQuery] = useState("");
  const { hits, searching } = useSymbolSearch(provider, open ? query : "");
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => setActive(0), [hits]);

  // Click or focus anywhere else closes the list.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (hit: SymbolHit) => {
    onChange(hit.ticker);
    onPick?.(hit);
    setQuery("");
    setOpen(false);
  };

  const showList = open && query.trim().length >= MIN_QUERY;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      pick(hits[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrap} className="relative">
      <Input
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && hits[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {searching && hits.length === 0 && (
            <li className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Searching…
            </li>
          )}
          {!searching && hits.length === 0 && (
            <li className="px-2 py-2 text-sm text-muted-foreground">
              No matches — you can still type the {provider === "mf" ? "scheme code" : "ticker"} yourself.
            </li>
          )}
          {hits.map((hit, i) => (
            <li
              key={hit.ticker}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`cursor-pointer rounded-sm px-2 py-1.5 text-sm ${
                i === active ? "bg-accent text-accent-foreground" : ""
              }`}
              onMouseEnter={() => setActive(i)}
              // mousedown, not click: a click would blur the input first and close the list.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(hit);
              }}
            >
              <div className="truncate font-medium">{hit.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {hit.ticker}
                {hit.exchange ? ` · ${hit.exchange}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
