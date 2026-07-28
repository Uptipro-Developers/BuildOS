import { useState, useRef, useEffect, type ReactNode } from "react";
import { Search, Check, X, ChevronDown, Plus } from "lucide-react";

interface Option {
  label: string;
  value: string;
  group?: string;
}

interface SearchableMultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  onNotFoundAction?: { label: string; icon?: ReactNode; onClick: (query: string) => void };
  emptyMessage?: string;
  max?: number;
}

export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  className = "",
  disabled = false,
  onNotFoundAction,
  emptyMessage = "No results found",
  max,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      (o.group && o.group.toLowerCase().includes(query.toLowerCase()))
  );

  const grouped = filtered.reduce<Record<string, Option[]>>((acc, o) => {
    const g = o.group || "Other";
    if (!acc[g]) acc[g] = [];
    acc[g].push(o);
    return acc;
  }, {});

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else if (max && value.length >= max) {
      onChange([optionValue]);
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeTag = (optionValue: string) => {
    onChange(value.filter((v) => v !== optionValue));
  };

  const selectedOptions = options.filter((o) => value.includes(o.value));

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-colors"
        style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
      >
        <span className={selectedOptions.length > 0 ? "text-gray-900 flex-1 truncate text-left" : "text-gray-400 flex-1 truncate text-left"}>
          {selectedOptions.length > 0
            ? selectedOptions.map((o) => o.label).join(", ")
            : placeholder}
        </span>
        {selectedOptions.length > 0 && (
          <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
            {selectedOptions.length}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2"
                style={{ ["--tw-ring-color" as any]: "#E8973A" }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setOpen(false); setQuery(""); }
                }}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {Object.keys(grouped).length === 0 ? (
              <div>
                <p className="px-3 py-2 text-sm text-gray-400">{emptyMessage}</p>
                {onNotFoundAction && query.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => onNotFoundAction.onClick(query)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-orange-600 hover:bg-orange-50 border-t border-gray-100 transition-colors font-medium"
                  >
                    {onNotFoundAction.icon || <Plus className="w-4 h-4" />}
                    {onNotFoundAction.label}
                  </button>
                )}
              </div>
            ) : (
              Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                    {group}
                  </div>
                  {items.map((option) => {
                    const selected = value.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggle(option.value)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-orange-50 transition-colors"
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected ? "bg-orange-500 border-orange-500" : "border-gray-300"
                        }`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="flex-1">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedOptions.map((o) => (
            <span
              key={o.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
              style={{ backgroundColor: "#FFF3E0", color: "#E8973A" }}
            >
              {o.label}
              <button
                type="button"
                onClick={() => removeTag(o.value)}
                className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
