"use client";

// Cache utility for storing data in sessionStorage with expiration
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export function getFromCache<T>(key: string, duration = DEFAULT_CACHE_DURATION): T | null {
  if (typeof window === "undefined") return null;
  
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;
    
    const parsed: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    
    if (now - parsed.timestamp < duration) {
      return parsed.data;
    }
    
    // Cache expired
    sessionStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

export function setInCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

export function removeFromCache(key: string): void {
  if (typeof window === "undefined") return;
  
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore errors
  }
}

export function clearCacheByPrefix(prefix: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // Ignore errors
  }
}

// Cache keys
export const CACHE_KEYS = {
  dashboard: "travelhub_dashboard",
  booking: (id: string) => `travelhub_booking_${id}`,
  itinerary: (id: string) => `travelhub_itinerary_${id}`,
  bookingsList: "travelhub_bookings_list",
  itinerariesList: "travelhub_itineraries_list",
} as const;
