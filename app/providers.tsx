"use client";

import { SessionProvider } from "next-auth/react";
import { BookingsProvider } from "@/lib/contexts/bookings-context";
import { SidebarProvider } from "@/components/sidebar";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider 
      basePath="/api/auth"
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      <SidebarProvider>
        <BookingsProvider>
          {children}
          <Toaster 
            position="top-center"
            toastOptions={{
              style: {
                background: '#18181b',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
              },
            }}
          />
        </BookingsProvider>
      </SidebarProvider>
    </SessionProvider>
  );
}
