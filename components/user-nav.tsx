"use client";

import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";

interface UserNavProps {
  collapsed?: boolean;
}

export function UserNav({ collapsed = false }: UserNavProps) {
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

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-2">
        <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
        {!collapsed && <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />}
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const loginUrl = getLoginUrl();
    
    return (
      <a
        href={loginUrl}
        className={`flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        {!collapsed && (
          <span className="text-sm text-zinc-400">Sign in</span>
        )}
      </a>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-2 ${collapsed ? "justify-center" : ""}`}>
      {user.image ? (
        <Image
          src={user.image}
          alt={user.name || "User"}
          width={32}
          height={32}
          className="rounded-full"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user.name?.[0] || user.email?.[0] || "U"}
          </span>
        </div>
      )}
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {user.name || user.email?.split("@")[0]}
          </p>
          <p className="text-xs text-zinc-500 truncate">
            {user.email}
          </p>
        </div>
      )}
    </div>
  );
}
