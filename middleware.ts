import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Middleware for TravelHub
 * 
 * Reads the session cookie from the main app (app.diasporaai.dev)
 * and protects routes that require authentication.
 * 
 * Public routes: /, /api/chat, /flights (search page)
 * Protected routes: /itinerary, /bookings, etc.
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// Routes that don't require authentication
const publicRoutes = [
  "/",
  "/flights", // Flight search is public
  "/api/chat", // AI chat is public
  "/api/flights", // Flight API is public
];

// Routes that start with these prefixes are public
const publicPrefixes = [
  "/api/auth", // Auth routes
  "/api/itinerary/geocode", // Geocoding API (needs to be accessible for fixes)
  "/_next", // Next.js internal
  "/favicon", // Static assets
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public prefixes
  if (publicPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Cookie name must match what's configured in auth.config.ts
  const cookieName = isDevelopment 
    ? "next-auth.session-token" 
    : "__Secure-next-auth.session-token";
  
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopment,
    cookieName,
  });

  // If no token and accessing protected route, redirect to main app login
  if (!token) {
    const loginUrl = isDevelopment
      ? "http://localhost:3001/login"
      : "https://app.diasporaai.dev/login";
    
    // Include redirect URL so user comes back after login
    const currentUrl = request.url;
    const redirectUrl = new URL(loginUrl);
    redirectUrl.searchParams.set("redirectUrl", currentUrl);
    
    return NextResponse.redirect(redirectUrl);
  }

  // User is authenticated, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
