"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UpcomingItinerary {
  id: string;
  slug: string;
  title: string;
  destination: string;
  country: string;
  countryFlag: string;
  duration: string;
  dates: string;
  coverImage: string;
  status: string;
  activityCount: number;
}

interface VisaApplication {
  id: string;
  country: string;
  countryCode: string;
  flagEmoji: string;
  visaType: string;
  status: string;
  progress: number;
  applicationNumber: string;
}

interface UpcomingFlight {
  id: string;
  destination: string;
  origin: string;
  departureDate: string;
  status: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  totalAmount: string;
  totalCurrency: string;
}

interface DashboardData {
  upcomingItinerary: UpcomingItinerary | null;
  itineraries: UpcomingItinerary[];
  activeVisaApplication: VisaApplication | null;
  visaApplications: VisaApplication[];
  upcomingFlight: UpcomingFlight | null;
  bookings: UpcomingFlight[];
  daysUntilTrip: number | null;
}

interface CachedData {
  data: DashboardData;
  timestamp: number;
}

const CACHE_KEY = "travelhub_dashboard_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedData(): DashboardData | null {
  if (typeof window === "undefined") return null;
  
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedData = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - parsed.timestamp < CACHE_DURATION) {
      return parsed.data;
    }
    
    // Cache expired, remove it
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function setCachedData(data: DashboardData): void {
  if (typeof window === "undefined") return;
  
  try {
    const cached: CachedData = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    // Prevent duplicate fetches
    if (fetchingRef.current) return;
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getCachedData();
      if (cached) {
        setData(cached);
        setIsLoading(false);
        return;
      }
    }

    try {
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/dashboard", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Please sign in to view your dashboard");
          return;
        }
        throw new Error("Failed to fetch dashboard data");
      }

      const dashboardData = await response.json();
      setData(dashboardData);
      setCachedData(dashboardData);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    data,
    isLoading,
    error,
    refresh: () => fetchDashboardData(true),
  };
}
