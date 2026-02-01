"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getFromCache, setInCache, CACHE_KEYS } from "@/lib/cache";
import type { Booking } from "@/lib/types/booking";

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export function useBookingDetail(bookingId: string, initialBooking?: Booking | null) {
  const [booking, setBooking] = useState<Booking | null>(initialBooking || null);
  const [isLoading, setIsLoading] = useState(!initialBooking);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchBooking = useCallback(async (forceRefresh = false) => {
    if (!bookingId) return;
    if (fetchingRef.current) return;

    // Check cache first (unless forcing refresh or we have initial data)
    if (!forceRefresh && !initialBooking) {
      const cached = getFromCache<Booking>(CACHE_KEYS.booking(bookingId), CACHE_DURATION);
      if (cached) {
        setBooking(cached);
        setIsLoading(false);
        return;
      }
    }

    // If we have initial booking data from server, use it and cache it
    if (initialBooking && !forceRefresh) {
      setInCache(CACHE_KEYS.booking(bookingId), initialBooking);
      setBooking(initialBooking);
      setIsLoading(false);
      return;
    }

    try {
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/bookings/${bookingId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError("Booking not found");
          return;
        }
        throw new Error("Failed to fetch booking");
      }

      const data = await response.json();
      setBooking(data.booking);
      setInCache(CACHE_KEYS.booking(bookingId), data.booking);
    } catch (err) {
      console.error("Error fetching booking:", err);
      setError("Failed to load booking details");
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [bookingId, initialBooking]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  return {
    booking,
    isLoading,
    error,
    refresh: () => fetchBooking(true),
  };
}
