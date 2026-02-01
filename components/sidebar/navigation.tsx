"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HomeIcon, GlobeIcon, CalendarIcon, PlaneIcon } from "@/components/icons";

// Visa icon component
const VisaIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 15h0M2 9h20" />
    <circle cx="17" cy="14" r="2" />
  </svg>
);

// Chat icon for main AI
const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <circle cx="9" cy="10" r="1" fill="currentColor" />
    <circle cx="12" cy="10" r="1" fill="currentColor" />
    <circle cx="15" cy="10" r="1" fill="currentColor" />
  </svg>
);

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  external?: boolean;
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: <HomeIcon />,
  },
  {
    href: "/flights",
    label: "Flights",
    icon: <PlaneIcon />,
  },
  // {
  //   href: "/trips",
  //   label: "My Trips",
  //   icon: <GlobeIcon />,
  // },
  {
    href: "/itinerary",
    label: "Itinerary",
    icon: <CalendarIcon />,
  },
  {
    href: "/visa",
    label: "Visa",
    icon: <VisaIcon />,
  },
  {
    href: "https://app.diasporaai.dev",
    label: "Main AI Chat",
    icon: <ChatIcon />,
    external: true,
  },
];

interface NavigationProps {
  isCollapsed?: boolean;
  onExpand?: () => void;
}

export function Navigation({ isCollapsed = false }: NavigationProps) {
  const pathname = usePathname();

  // Collapsed view - show same icons as expanded, just without labels
  if (isCollapsed) {
    return (
      <nav className="flex flex-col items-center space-y-2">
        {navItems.map((item) => {
          const isActive = !item.external && pathname === item.href;
          const linkProps = item.external 
            ? { target: "_blank" as const, rel: "noopener noreferrer" }
            : {};
          
          return (
            <Link
              key={item.href}
              href={item.href}
              {...linkProps}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-colors ${
                isActive
                  ? "bg-blue-500/20 text-blue-400"
                  : item.external
                    ? "text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
              }`}
              title={item.external ? `${item.label} ↗` : item.label}
            >
              {item.icon}
            </Link>
          );
        })}
      </nav>
    );
  }

  // Expanded view - full navigation
  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = !item.external && pathname === item.href;
        const linkProps = item.external 
          ? { target: "_blank" as const, rel: "noopener noreferrer" }
          : {};
        
        return (
          <Link
            key={item.href}
            href={item.href}
            {...linkProps}
            className={`group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
              isActive
                ? "bg-blue-500/20 text-blue-400"
                : item.external
                  ? "text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <motion.span
              whileHover={{ scale: 1.1 }}
              className={isActive ? "text-blue-400" : item.external ? "text-purple-400" : ""}
            >
              {item.icon}
            </motion.span>
            <AnimatePresence>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium flex items-center gap-1"
              >
                {item.label}
                {item.external && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </motion.span>
            </AnimatePresence>
          </Link>
        );
      })}
    </nav>
  );
}
