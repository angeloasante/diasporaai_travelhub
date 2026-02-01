"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  error?: string;
  disabled?: boolean;
}

export function SelectField({
  id,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled = false,
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );
  const selectedOption = options.find((opt) => opt.value === value);

  const handleClose = () => {
    setIsOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
    }
  };

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border ${
          error ? "border-red-500/50" : "border-white/10"
        } text-left transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/[0.07]"
        }`}
      >
        <span className={selectedOption ? "text-white text-sm" : "text-zinc-500 text-sm"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDownIcon />
      </button>

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}

      <AnimatePresence>
        {isOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              onClick={handleClose}
              onKeyDown={handleKeyDown}
              aria-label="Close dropdown"
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="listbox"
              className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl bg-[#151517] border border-white/10 shadow-xl overflow-hidden"
            >
              <div className="p-2 border-b border-white/5">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={value === opt.value}
                      onClick={() => {
                        onChange(opt.value);
                        handleClose();
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        value === opt.value
                          ? "bg-blue-500/20 text-blue-400"
                          : "text-white hover:bg-white/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))
                ) : (
                  <p className="text-zinc-500 text-sm text-center py-4">No results found</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
