"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  isHovered: boolean;
  setIsHovered: (value: boolean) => void;
  showExpanded: boolean;
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  setIsCollapsed: () => {},
  isHovered: false,
  setIsHovered: () => {},
  showExpanded: true,
});

export const useSidebar = () => useContext(SidebarContext);

const STORAGE_KEY = "diaspora-sidebar-collapsed";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsCollapsedState(stored === "true");
    }
    setMounted(true);
  }, []);

  // Save to localStorage when changed
  const setIsCollapsed = (value: boolean) => {
    setIsCollapsedState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  // Determine if sidebar should show expanded view
  const showExpanded = !isCollapsed || isHovered;

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <SidebarContext.Provider
        value={{
          isCollapsed: false,
          setIsCollapsed,
          isHovered: false,
          setIsHovered,
          showExpanded: true,
        }}
      >
        {children}
      </SidebarContext.Provider>
    );
  }

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        isHovered,
        setIsHovered,
        showExpanded,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
