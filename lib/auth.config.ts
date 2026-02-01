import type { NextAuthConfig } from "next-auth";

/**
 * Shared auth configuration for TravelHub
 * Configured to read session cookies from the main app (app.diasporaai.dev)
 * 
 * IMPORTANT: This must use the same AUTH_SECRET and cookie configuration
 * as the main app to enable cross-subdomain authentication
 */

// Domain configuration for cookie sharing across subdomains
const cookieDomain = process.env.NODE_ENV === 'production' ? '.diasporaai.dev' : undefined;
const useSecure = process.env.NODE_ENV === 'production';

export const authConfig = {
  pages: {
    // Redirect to main app's login page for authentication
    signIn: process.env.NODE_ENV === 'production' 
      ? "https://app.diasporaai.dev/login"
      : "http://localhost:3001/login",
  },
  providers: [
    // No providers needed - we only read the session from main app's cookie
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicRoute = ['/'].includes(nextUrl.pathname);
      
      // Allow public access to certain routes
      if (isPublicRoute) {
        return true;
      }
      
      // Require authentication for all other routes
      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.type = (user as any).type || "regular";
        token.isAdmin = (user as any).isAdmin || false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.type = token.type as "guest" | "regular";
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
  // Cookie configuration MUST match the main app exactly
  cookies: {
    sessionToken: {
      name: useSecure 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: useSecure ? 'none' : 'lax',
        path: '/',
        secure: useSecure,
        domain: cookieDomain,
      }
    },
    callbackUrl: {
      name: useSecure
        ? "__Secure-next-auth.callback-url"
        : "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: useSecure ? 'none' : 'lax',
        path: '/',
        secure: useSecure,
        domain: cookieDomain,
      }
    },
    csrfToken: {
      name: useSecure
        ? "__Host-next-auth.csrf-token"
        : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: useSecure ? 'none' : 'lax',
        path: '/',
        secure: useSecure,
        // Note: __Host- prefix cookies cannot have a domain set
        domain: useSecure ? undefined : cookieDomain,
      }
    },
  },
  useSecureCookies: useSecure,
  trustHost: true,
} satisfies NextAuthConfig;
