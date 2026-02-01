"use client";

import { MenuIcon } from "@/components/icons";

interface MobileNavToggleProps {
  onClick?: () => void;
}

export function MobileNavToggle({ onClick }: MobileNavToggleProps) {
  return (
    <button
      type="button"
      aria-label="Toggle navigation menu"
      onClick={onClick}
      className="fixed bottom-6 right-6 md:hidden w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg z-50"
    >
      <MenuIcon />
    </button>
  );
}
