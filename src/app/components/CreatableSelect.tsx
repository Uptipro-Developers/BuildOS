import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, X } from "lucide-react";

interface Option {
  label: string;
  value: string;
  meta?: string; // optional secondary info (e.g. currency symbol)
}

interface CreatableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string, option?: Option) => void;
  onCreateOption?: (inputValue: string) => Option | void;
  placeholder?: string;
  label?: string;
  createLabel?: string; // e.g. "Add currency"
  className?: string;
  disabled?: boolean;
  /** If provided, a small "meta" input is shown when creating a new option */
  metaPlaceholder?: string;
}

export function CreatableSelect({
  options,
  value,
  onChange,
  onCreateOption,
  placeholder = "Select or type to search...",
  createLabel = "Add new option",
  className = "",
  disabled = false,
  metaPlaceholder,
}: CreatableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newMeta, setNewMeta] = useState("");
  const [internalOptions, setInternalOptions] = useState<Option[]>(options);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external options changes
  useEffect(() => {
    setInternalOptions(options);
  }, [options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = internalOptions.find((o) => o.value === value);

  const filtered = internalOptions.filter(
    (o) =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      o.value.toLowerCase().includes(query.toLowerCase()) ||
      (o.meta && o.meta.toLowerCase().includes(query.toLowerCase()))
  );

  const handleSelect = (option: Option) => {
    onChange(option.value, option);
    setOpen(false);
    setQuery("");
  };

  const handleCreate = () => {
    if (!newLabel.trim()) return;
    const newOption: Option = {
      label: newLabel.trim(),
      value: newLabel.trim().toLowerCase().replace(/\s+/g, "-"),
      ...(newMeta.trim() ? { meta: newMeta.trim() } : {}),
    };

    let resultOption = newOption;
    if (onCreateOption) {
      const result = onCreateOption(newLabel.trim());
      if (result) resultOption = result;
    }

    setInternalOptions((prev) => [...prev, resultOption]);
    onChange(resultOption.value, resultOption);
    setCreating(false);
    setNewLabel("");
    setNewMeta("");
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-md text-left text-sm transition-colors
          ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200" : "bg-white border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"}
        `}
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-400"}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.meta && (
                <span className="inline-block w-6 text-center font-mono text-gray-500 text-xs">{selectedOption.meta}</span>
              )}
              {selectedOption.label}
            </span>
          ) : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
              }}
            />
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">No results found</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-indigo-50 transition-colors"
                >
                  {option.meta && (
                    <span className="inline-block w-6 text-center font-mono text-gray-500 text-xs shrink-0">{option.meta}</span>
                  )}
                  <span className="flex-1">{option.label}</span>
                  {option.value === value && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>
              ))
            )}
          </div>

          {/* Create new option */}
          {onCreateOption !== undefined && (
            <div className="border-t border-gray-100 p-2">
              {creating ? (
                <div className="space-y-2">
                  <input
                    autoFocus
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Name"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                  {metaPlaceholder && (
                    <input
                      type="text"
                      value={newMeta}
                      onChange={(e) => setNewMeta(e.target.value)}
                      placeholder={metaPlaceholder}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={!newLabel.trim()}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCreating(false); setNewLabel(""); setNewMeta(""); }}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {createLabel}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
