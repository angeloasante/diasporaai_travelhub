import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import { authConfig } from "./auth.config";

export type UserType = "guest" | "regular";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
    isAdmin: boolean;
  }
}

/**
 * TravelHub Auth - Read-only authentication
 * 
 * This configuration allows TravelHub to read the session cookie
 * set by the main app (app.diasporaai.dev). Users authenticate
 * on the main app and the session is shared via cookies.
 * 
 * IMPORTANT: AUTH_SECRET must match the main app's AUTH_SECRET
 */
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  // No providers - authentication happens on main app
  providers: [],
});
