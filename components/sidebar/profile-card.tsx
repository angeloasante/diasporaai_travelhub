"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

interface ProfileCardProps {
  isCollapsed?: boolean;
}

export function ProfileCard({ isCollapsed = false }: ProfileCardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  const getLoginUrl = () => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? "https://app.diasporaai.dev/login"
      : "http://localhost:3001/login";
    
    // Include current URL as redirect parameter
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      return `${baseUrl}?redirectUrl=${encodeURIComponent(currentUrl)}`;
    }
    return baseUrl;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 pt-4 border-t border-white/5">
        <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
        {!isCollapsed && (
          <div className="space-y-2">
            <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
            <div className="h-2 w-16 bg-zinc-800 rounded animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  // Not authenticated - show sign in
  if (!isAuthenticated || !user) {
    const loginUrl = getLoginUrl();
    
    if (isCollapsed) {
      return (
        <div className="flex justify-center pt-4 border-t border-white/5">
          <a href={loginUrl}>
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500/30 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </motion.div>
          </a>
        </div>
      );
    }

    return (
      <a href={loginUrl} className="flex items-center gap-3 pt-4 border-t border-white/5 hover:bg-white/5 rounded-lg transition-colors -mx-2 px-2 py-2">
        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500/30 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="overflow-hidden">
          <div className="text-sm font-semibold text-white">Sign in</div>
          <div className="text-xs text-zinc-500">Access your account</div>
        </div>
      </a>
    );
  }

  // Authenticated - show user info
  const displayName = user.name || user.email?.split("@")[0] || "Traveler";
  const avatarUrl = user.image;
  const userInitial = displayName[0]?.toUpperCase() || "T";

  if (isCollapsed) {
    return (
      <div className="flex justify-center pt-4 border-t border-white/5">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500/30"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-medium">{userInitial}</span>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 pt-4 border-t border-white/5">
      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500/30">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-sm font-medium">{userInitial}</span>
          </div>
        )}
      </div>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          className="overflow-hidden"
        >
          <div className="text-sm font-semibold text-white">{displayName}</div>
          <div className="text-xs text-zinc-500">{user.email || "Traveler"}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
