"use client";

import { useSession } from "next-auth/react";

export type UserType = "guest" | "regular";

export interface TravelHubUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  type: UserType;
  isAdmin: boolean;
}

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user as TravelHubUser | undefined,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    status,
  };
}
