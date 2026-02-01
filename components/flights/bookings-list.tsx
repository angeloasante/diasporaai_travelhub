"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartIcon, ShareIcon } from "@/components/icons";
import { useBookings } from "@/lib/contexts/bookings-context";
import type { Booking, OfferDetails, Slice, Segment } from "@/lib/types/booking";

// Filter types
type StatusFilter = "all" | "successful" | "failed" | "processing";
type PaymentFilter = "all" | "card" | "momo";

// Aircraft images by type
const aircraftImages: Record<string, string> = {
  "787": "https://images.unsplash.com/photo-1529074963764-98f45c47344b?q=80&w=400&auto=format&fit=crop",
  "A350": "https://images.unsplash.com/photo-1583244685026-d8519b5e3d21?q=80&w=400&auto=format&fit=crop",
  "777": "https://images.unsplash.com/photo-1570710891163-6d3b5c47248b?q=80&w=400&auto=format&fit=crop",
  "A380": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=400&auto=format&fit=crop",
  "737": "https://images.unsplash.com/photo-1559268950-2d7ceb2efa3a?q=80&w=400&auto=format&fit=crop",
  "A320": "https://images.unsplash.com/photo-1474302770737-173ee21bab63?q=80&w=400&auto=format&fit=crop",
  default: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?q=80&w=400&auto=format&fit=crop",
};

function getAircraftImage(aircraftName: string | null | undefined): string {
  if (!aircraftName) return aircraftImages.default;
  
  for (const [key, url] of Object.entries(aircraftImages)) {
    if (aircraftName.toLowerCase().includes(key.toLowerCase())) {
      return url;
    }
  }
  return aircraftImages.default;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(isoDuration: string): string {
  // Parse ISO 8601 duration like "PT6H15M"
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return isoDuration;
  
  const hours = match[1] ? `${match[1]}h` : "";
  const minutes = match[2] ? ` ${match[2]}m` : "";
  return `${hours}${minutes}`.trim();
}

function getStatusBadge(status: Booking["status"]) {
  const styles: Record<Booking["status"], { bg: string; text: string; label: string }> = {
    ticketed: { bg: "bg-green-500/10", text: "text-green-400", label: "Confirmed" },
    processing: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Processing" },
    pending_payment: { bg: "bg-orange-500/10", text: "text-orange-400", label: "Pending" },
    failed: { bg: "bg-red-500/10", text: "text-red-400", label: "Failed" },
    refund_pending: { bg: "bg-purple-500/10", text: "text-purple-400", label: "Refund Pending" },
    refunded: { bg: "bg-zinc-500/10", text: "text-zinc-400", label: "Refunded" },
  };
  return styles[status] || styles.pending_payment;
}

function getCabinTag(cabinClass: string): string {
  const cabinLabels: Record<string, string> = {
    economy: "Economy",
    premium_economy: "Premium Economy",
    business: "Business",
    first: "First Class",
  };
  return cabinLabels[cabinClass] || cabinClass;
}

// Helper to get passengers count - handles both array and JSON string
function getPassengersCount(passengers: unknown): number {
  if (Array.isArray(passengers)) {
    return passengers.length;
  }
  if (typeof passengers === 'string') {
    try {
      const parsed = JSON.parse(passengers);
      return Array.isArray(parsed) ? parsed.length : 1;
    } catch {
      return 1;
    }
  }
  return 1;
}

interface FlightCardData {
  id: string;
  reference: string | null;
  aircraft: string;
  passengers: number;
  tags: string[];
  origin: {
    city: string;
    code: string;
    date: string;
    time: string;
  };
  destination: {
    city: string;
    code: string;
    date: string;
    time: string;
  };
  duration: string;
  price: number;
  currency: string;
  status: Booking["status"];
  paymentMethod: string | null;
  aircraftImage: string;
  airlineLogo: string | null;
  airlineName: string;
}

function transformBookingToCard(booking: Booking): FlightCardData | null {
  const offerDetails = booking.offerDetails as OfferDetails | null;
  
  // Try to extract aircraft name from offerDetails even if slices might be incomplete
  const extractAircraftName = (): string => {
    // First try: from offerDetails slices
    if (offerDetails?.slices?.[0]?.segments?.[0]?.aircraft?.name) {
      return offerDetails.slices[0].segments[0].aircraft.name;
    }
    // Second try: check bookingData for any aircraft info (stored from Duffel response)
    const bookingData = booking.bookingData as any;
    if (bookingData?.duffelBooking?.slices?.[0]?.segments?.[0]?.aircraft?.name) {
      return bookingData.duffelBooking.slices[0].segments[0].aircraft.name;
    }
    if (bookingData?.selectedOffer?.slices?.[0]?.segments?.[0]?.aircraft?.name) {
      return bookingData.selectedOffer.slices[0].segments[0].aircraft.name;
    }
    return "Commercial Aircraft";
  };

  const extractAirlineName = (): string => {
    if (offerDetails?.slices?.[0]?.segments?.[0]?.marketing_carrier?.name) {
      return offerDetails.slices[0].segments[0].marketing_carrier.name;
    }
    if (offerDetails?.owner?.name) {
      return offerDetails.owner.name;
    }
    const bookingData = booking.bookingData as any;
    if (bookingData?.duffelBooking?.slices?.[0]?.segments?.[0]?.marketing_carrier?.name) {
      return bookingData.duffelBooking.slices[0].segments[0].marketing_carrier.name;
    }
    return "Airline";
  };
  
  if (!offerDetails?.slices?.[0]) {
    // Fallback for bookings without full offer details
    const aircraftName = extractAircraftName();
    const airlineName = extractAirlineName();
    
    return {
      id: booking.id,
      reference: booking.reference,
      aircraft: aircraftName.toUpperCase(),
      passengers: getPassengersCount(booking.passengers),
      tags: [getCabinTag(booking.cabinClass), getStatusBadge(booking.status).label],
      origin: {
        city: booking.origin,
        code: booking.origin,
        date: formatDate(booking.departureDate),
        time: "—",
      },
      destination: {
        city: booking.destination,
        code: booking.destination,
        date: formatDate(booking.departureDate),
        time: "—",
      },
      duration: "—",
      price: parseFloat(booking.customerPrice),
      currency: booking.totalCurrency,
      status: booking.status,
      paymentMethod: booking.paymentMethod,
      aircraftImage: getAircraftImage(aircraftName),
      airlineLogo: booking.airlineLogo,
      airlineName,
    };
  }

  const slice = offerDetails.slices[0] as Slice;
  const firstSegment = slice.segments?.[0] as Segment | undefined;
  const lastSegment = slice.segments?.[slice.segments.length - 1] as Segment | undefined;
  
  const aircraftName = firstSegment?.aircraft?.name || extractAircraftName();
  const airlineName = firstSegment?.marketing_carrier?.name || offerDetails.owner?.name || extractAirlineName();
  const airlineLogo = firstSegment?.marketing_carrier?.logo_symbol_url || offerDetails.owner?.logo_symbol_url || booking.airlineLogo;

  return {
    id: booking.id,
    reference: booking.reference,
    aircraft: aircraftName.toUpperCase(),
    passengers: getPassengersCount(booking.passengers),
    tags: [getCabinTag(booking.cabinClass), getStatusBadge(booking.status).label],
    origin: {
      city: slice.origin?.city_name || slice.origin?.name || booking.origin,
      code: slice.origin?.iata_code || booking.origin,
      date: firstSegment ? formatDate(firstSegment.departing_at) : formatDate(booking.departureDate),
      time: firstSegment ? formatTime(firstSegment.departing_at) : "—",
    },
    destination: {
      city: slice.destination?.city_name || slice.destination?.name || booking.destination,
      code: slice.destination?.iata_code || booking.destination,
      date: lastSegment ? formatDate(lastSegment.arriving_at) : formatDate(booking.departureDate),
      time: lastSegment ? formatTime(lastSegment.arriving_at) : "—",
    },
    duration: slice.duration ? formatDuration(slice.duration) : "—",
    price: parseFloat(booking.customerPrice),
    currency: booking.totalCurrency,
    status: booking.status,
    paymentMethod: booking.paymentMethod,
    aircraftImage: getAircraftImage(aircraftName),
    airlineLogo: airlineLogo || null,
    airlineName,
  };
}

export function BookingsList() {
  const router = useRouter();
  const { bookings: rawBookings, loading, error, fetchBookings } = useBookings();
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

  // Transform bookings using useMemo for performance
  const bookings = useMemo(() => {
    return rawBookings
      .map(transformBookingToCard)
      .filter((b): b is FlightCardData => b !== null);
  }, [rawBookings]);

  // Apply filters
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "successful" && booking.status !== "ticketed") return false;
        if (statusFilter === "failed" && booking.status !== "failed" && booking.status !== "refunded" && booking.status !== "refund_pending") return false;
        if (statusFilter === "processing" && booking.status !== "processing" && booking.status !== "pending_payment") return false;
      }
      
      // Payment method filter
      if (paymentFilter !== "all") {
        const pm = booking.paymentMethod?.toLowerCase() || "";
        if (paymentFilter === "card" && pm !== "stripe") return false;
        if (paymentFilter === "momo" && !pm.includes("paystack") && !pm.includes("momo")) return false;
      }
      
      return true;
    });
  }, [bookings, statusFilter, paymentFilter]);

  // Count bookings by filter for badges
  const counts = useMemo(() => ({
    all: bookings.length,
    successful: bookings.filter(b => b.status === "ticketed").length,
    failed: bookings.filter(b => b.status === "failed" || b.status === "refunded" || b.status === "refund_pending").length,
    processing: bookings.filter(b => b.status === "processing" || b.status === "pending_payment").length,
    card: bookings.filter(b => b.paymentMethod?.toLowerCase() === "stripe").length,
    momo: bookings.filter(b => {
      const pm = b.paymentMethod?.toLowerCase() || "";
      return pm.includes("paystack") || pm.includes("momo");
    }).length,
  }), [bookings]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Prefetch all booking detail pages for instant navigation
  useEffect(() => {
    bookings.forEach((booking) => {
      router.prefetch(`/flights/${booking.id}`);
    });
  }, [bookings, router]);

  const handleViewDetails = (e: React.MouseEvent, bookingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/flights/${bookingId}`);
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-[#0f0f11] border border-white/5 p-6 animate-pulse"
          >
            <div className="h-4 bg-zinc-800 rounded w-1/4 mb-4" />
            <div className="h-6 bg-zinc-800 rounded w-1/2 mb-4" />
            <div className="flex gap-6">
              <div className="w-40 h-24 bg-zinc-800 rounded-xl" />
              <div className="flex-1 flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-zinc-800 rounded w-20" />
                  <div className="h-8 bg-zinc-800 rounded w-16" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-zinc-800 rounded w-20" />
                  <div className="h-8 bg-zinc-800 rounded w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-[#0f0f11] border border-red-500/20 p-8 text-center">
        <p className="text-red-400 mb-2">Error loading bookings</p>
        <p className="text-sm text-zinc-500">{error}</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl bg-[#0f0f11] border border-white/5 p-8 text-center">
        <p className="text-zinc-400 mb-2">No bookings found</p>
        <p className="text-sm text-zinc-500">Your flight bookings will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-zinc-500 mr-2 self-center">Status:</span>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === "all"
                ? "bg-white text-black"
                : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("successful")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === "successful"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            ✅ Successful ({counts.successful})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("failed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === "failed"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            ❌ Failed ({counts.failed})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("processing")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === "processing"
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            ⏳ Processing ({counts.processing})
          </button>
        </div>

        {/* Payment Method Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-zinc-500 mr-2 self-center">Payment:</span>
          <button
            type="button"
            onClick={() => setPaymentFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              paymentFilter === "all"
                ? "bg-white text-black"
                : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            All Methods
          </button>
          <button
            type="button"
            onClick={() => setPaymentFilter("card")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              paymentFilter === "card"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
            Cards ({counts.card})
          </button>
          <button
            type="button"
            onClick={() => setPaymentFilter("momo")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              paymentFilter === "momo"
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
            </svg>
            Mobile Money ({counts.momo})
          </button>
        </div>
      </div>

      {/* Results count */}
      {(statusFilter !== "all" || paymentFilter !== "all") && (
        <div className="text-sm text-zinc-500">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </div>
      )}

      {/* Empty state for filtered results */}
      {filteredBookings.length === 0 && (
        <div className="rounded-2xl bg-[#0f0f11] border border-white/5 p-8 text-center">
          <p className="text-zinc-400 mb-2">No bookings match your filters</p>
          <p className="text-sm text-zinc-500">Try adjusting your filter settings</p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setPaymentFilter("all");
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-zinc-800 text-white text-sm hover:bg-zinc-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Bookings List */}
      {filteredBookings.map((booking) => (
        <Link
          key={booking.id}
          href={`/flights/${booking.id}`}
          className="block rounded-2xl bg-[#0f0f11] border border-white/5 p-6 hover:border-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {/* Top Row: Tags and Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {booking.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-white/5"
                >
                  {tag}
                </span>
              ))}
              {/* Payment method badge */}
              {booking.paymentMethod && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    booking.paymentMethod === "stripe"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                  }`}
                >
                  {booking.paymentMethod === "stripe" ? "💳 Card" : "📱 MoMo"}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Save to favorites"
                onClick={(e) => e.stopPropagation()}
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
              >
                <HeartIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Share booking"
                onClick={(e) => e.stopPropagation()}
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
              >
                <ShareIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Aircraft Info */}
          <div className="mb-4 flex items-center gap-3">
            {booking.airlineLogo && (
              <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={booking.airlineLogo} 
                  alt={booking.airlineName}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {booking.aircraft}
              </h3>
              <p className="text-sm text-zinc-500">
                {booking.airlineName} • {booking.passengers} {booking.passengers === 1 ? "passenger" : "passengers"}
              </p>
            </div>
          </div>

          {/* Main Content: Aircraft Image + Flight Route + Price */}
          <div className="flex flex-col lg:flex-row items-center gap-6">
            {/* Aircraft Image */}
            <div className="w-full lg:w-40 h-24 rounded-xl overflow-hidden bg-zinc-800/50 flex-shrink-0">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url('${booking.aircraftImage}')` }}
              />
            </div>

            {/* Flight Route */}
            <div className="flex-1 flex items-center justify-between gap-4 w-full">
              {/* Origin */}
              <div className="text-center lg:text-left">
                <p className="text-sm text-zinc-400">{booking.origin.city}</p>
                <p className="text-3xl font-bold text-white">{booking.origin.code}</p>
                <p className="text-sm text-zinc-500">
                  {booking.origin.date}, {booking.origin.time}
                </p>
              </div>

              {/* Flight Path */}
              <div className="flex-1 flex flex-col items-center px-4">
                <div className="w-full flex items-center">
                  <div className="w-2 h-2 rounded-full border-2 border-zinc-600" />
                  <div className="flex-1 border-t-2 border-dashed border-zinc-700 relative">
                    <svg
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                    </svg>
                  </div>
                  <div className="w-2 h-2 rounded-full border-2 border-zinc-600" />
                </div>
                <p className="text-xs text-zinc-500 mt-2">{booking.duration}</p>
              </div>

              {/* Destination */}
              <div className="text-center lg:text-right">
                <p className="text-sm text-zinc-400">{booking.destination.city}</p>
                <p className="text-3xl font-bold text-white">{booking.destination.code}</p>
                <p className="text-sm text-zinc-500">
                  {booking.destination.date}, {booking.destination.time}
                </p>
              </div>
            </div>

            {/* Price and Actions */}
            <div className="flex flex-col items-end gap-3 flex-shrink-0 w-full lg:w-auto mt-4 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">
                  {booking.currency === "GBP" ? "£" : booking.currency === "EUR" ? "€" : booking.currency === "GHS" ? "₵" : "$"}
                  {booking.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {booking.reference && (
                <span className="text-xs text-zinc-500">Ref: {booking.reference}</span>
              )}
              <div className="flex gap-2 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={(e) => handleViewDetails(e, booking.id)}
                  className="flex-1 lg:flex-none px-5 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white hover:bg-white/5 transition-colors"
                >
                  View Details
                </button>
                <button
                  type="button"
                  onClick={(e) => handleViewDetails(e, booking.id)}
                  className="flex-1 lg:flex-none px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
                >
                  Manage
                </button>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
