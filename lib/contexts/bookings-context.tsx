"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { Booking } from "@/lib/types/booking";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface BookingsContextType {
  bookings: Booking[];
  bookingsMap: Map<string, Booking>;
  loading: boolean;
  error: string | null;
  fetchBookings: () => Promise<void>;
  getBooking: (id: string) => Booking | undefined;
  updateBooking: (booking: Booking) => void;
  lastFetched: number | null;
}

const BookingsContext = createContext<BookingsContextType | null>(null);

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache
const STORAGE_KEY = "travelhub_bookings_cache";

// Helper to safely access sessionStorage - only call after mount
function getStoredCache(): { bookings: Booking[]; timestamp: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check if cache is still valid
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function setStoredCache(bookings: Booking[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      bookings,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore storage errors
  }
}

export function BookingsProvider({ children }: { children: ReactNode }) {
  // Initialize with empty state to avoid hydration mismatch
  // Cache will be loaded in useEffect after mount
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsMap, setBookingsMap] = useState<Map<string, Booking>>(new Map());
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const hydratedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const lastFetchedRef = useRef<number | null>(null);
  const bookingsCountRef = useRef(0);

  // Load from cache after hydration (client-side only)
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    
    const cached = getStoredCache();
    if (cached?.bookings && cached.bookings.length > 0) {
      setBookings(cached.bookings);
      bookingsCountRef.current = cached.bookings.length;
      const map = new Map<string, Booking>();
      for (const booking of cached.bookings) {
        map.set(booking.id, booking);
      }
      setBookingsMap(map);
      setLastFetched(cached.timestamp);
      lastFetchedRef.current = cached.timestamp;
      setLoading(false);
    }
  }, []);

  const fetchBookings = useCallback(async (force = false) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    // Skip if we have fresh cached data (use refs to avoid dependency issues)
    if (!force && lastFetchedRef.current && Date.now() - lastFetchedRef.current < CACHE_DURATION && bookingsCountRef.current > 0) {
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/bookings");
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      const fetchedBookings = data.bookings as Booking[];
      setBookings(fetchedBookings);
      bookingsCountRef.current = fetchedBookings.length;
      
      // Build map for O(1) lookups
      const map = new Map<string, Booking>();
      fetchedBookings.forEach((booking) => {
        map.set(booking.id, booking);
      });
      setBookingsMap(map);
      
      const now = Date.now();
      setLastFetched(now);
      lastFetchedRef.current = now;
      
      // Persist to sessionStorage
      setStoredCache(fetchedBookings);
    } catch (err) {
      setError("Failed to load bookings");
      console.error(err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []); // Empty deps - uses refs for values that change

  const getBooking = useCallback((id: string): Booking | undefined => {
    return bookingsMap.get(id);
  }, [bookingsMap]);

  const updateBooking = useCallback((updatedBooking: Booking) => {
    setBookings((prev) => 
      prev.map((b) => b.id === updatedBooking.id ? updatedBooking : b)
    );
    setBookingsMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(updatedBooking.id, updatedBooking);
      return newMap;
    });
  }, []);

  // Set up Supabase real-time subscription
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      // Use the singleton supabase client to avoid multiple instances
      const { supabase } = await import("@/lib/supabase");
      
      if (!supabase) return;

      channel = supabase
        .channel("bookings-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "booking",
          },
          (payload) => {
            console.log("Real-time update:", payload);
            
            if (payload.eventType === "INSERT") {
              const newBooking = payload.new as Booking;
              setBookings((prev) => [newBooking, ...prev]);
              setBookingsMap((prev) => {
                const newMap = new Map(prev);
                newMap.set(newBooking.id, newBooking);
                return newMap;
              });
            } else if (payload.eventType === "UPDATE") {
              const updatedBooking = payload.new as Booking;
              updateBooking(updatedBooking);
            } else if (payload.eventType === "DELETE") {
              const deletedId = (payload.old as { id: string }).id;
              setBookings((prev) => prev.filter((b) => b.id !== deletedId));
              setBookingsMap((prev) => {
                const newMap = new Map(prev);
                newMap.delete(deletedId);
                return newMap;
              });
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [updateBooking]);

  return (
    <BookingsContext.Provider
      value={{
        bookings,
        bookingsMap,
        loading,
        error,
        fetchBookings,
        getBooking,
        updateBooking,
        lastFetched,
      }}
    >
      {children}
    </BookingsContext.Provider>
  );
}

export function useBookings() {
  const context = useContext(BookingsContext);
  if (!context) {
    throw new Error("useBookings must be used within a BookingsProvider");
  }
  return context;
}

export function useBooking(id: string) {
  const { bookingsMap, fetchBookings, loading: contextLoading, lastFetched } = useBookings();
  const [booking, setBooking] = useState<Booking | undefined>(undefined);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Immediately check cache on every render
  useEffect(() => {
    const cached = bookingsMap.get(id);
    if (cached) {
      setBooking(cached);
      setLocalLoading(false);
    }
  }, [bookingsMap, id]);

  useEffect(() => {
    // If we already have the booking from cache, we're done
    if (bookingsMap.has(id)) {
      setBooking(bookingsMap.get(id));
      setLocalLoading(false);
      return;
    }

    // If context already has data and our booking isn't in it, fetch individually
    if (lastFetched && !bookingsMap.has(id) && !hasFetched.current) {
      hasFetched.current = true;
      setLocalLoading(true);
      
      fetch(`/api/bookings/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setLocalError(data.error);
          } else {
            setBooking(data.booking);
          }
        })
        .catch(err => {
          setLocalError("Failed to load booking");
          console.error(err);
        })
        .finally(() => {
          setLocalLoading(false);
        });
      return;
    }

    // If context hasn't fetched yet, trigger fetch (non-blocking for UI)
    if (!lastFetched && !contextLoading && !hasFetched.current) {
      hasFetched.current = true;
      fetchBookings();
    }
  }, [id, bookingsMap, fetchBookings, lastFetched, contextLoading]);

  return {
    booking,
    loading: localLoading && !booking,
    error: localError,
  };
}
