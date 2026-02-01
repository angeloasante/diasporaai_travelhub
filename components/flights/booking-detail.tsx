"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon } from "@/components/icons";
import { FlightMap } from "@/components/flights/flight-map";
import { setInCache, CACHE_KEYS } from "@/lib/cache";
import type { Booking, OfferDetails, Slice, Segment, Passenger } from "@/lib/types/booking";

// Destination images
const destinationImages: Record<string, string> = {
  ACC: "https://images.unsplash.com/photo-1622360406859-994119d5069b?q=80&w=600&auto=format&fit=crop",
  LHR: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=600&auto=format&fit=crop",
  LOS: "https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?q=80&w=600&auto=format&fit=crop",
  NBO: "https://images.unsplash.com/photo-1611348524140-53c9a25263d6?q=80&w=600&auto=format&fit=crop",
  JNB: "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?q=80&w=600&auto=format&fit=crop",
  JFK: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=600&auto=format&fit=crop",
  CDG: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop",
  default: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=600&auto=format&fit=crop",
};

function getDestinationImage(code: string): string {
  return destinationImages[code] || destinationImages.default;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return isoDuration;
  const hours = match[1] ? `${match[1]}h` : "";
  const minutes = match[2] ? ` ${match[2]}m` : "";
  return `${hours}${minutes}`.trim();
}

interface BookingDetailProps {
  bookingId: string;
  initialBooking?: Booking | null;
}

export function BookingDetail({ bookingId, initialBooking }: BookingDetailProps) {
  const booking = initialBooking;

  // Cache the booking data when it's available from server
  useEffect(() => {
    if (initialBooking && bookingId) {
      setInCache(CACHE_KEYS.booking(bookingId), initialBooking);
    }
  }, [initialBooking, bookingId]);

  if (!booking) {
    return (
      <div className="rounded-3xl bg-[#0f0f11] border border-red-500/20 p-8 text-center">
        <p className="text-red-400 mb-2">Booking not found</p>
        <p className="text-sm text-zinc-500 mb-4">Could not find booking with ID: {bookingId}</p>
        <Link
          href="/flights"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
        >
          ← Back to bookings
        </Link>
      </div>
    );
  }

  const offerDetails = booking.offerDetails as OfferDetails | null;
  const slice = offerDetails?.slices?.[0] as Slice | undefined;
  const firstSegment = slice?.segments?.[0] as Segment | undefined;
  const lastSegment = slice?.segments?.[slice.segments.length - 1] as Segment | undefined;
  
  // Handle passengers - could be array, JSON string, or undefined
  let passengers: Passenger[] = [];
  if (booking.passengers) {
    if (Array.isArray(booking.passengers)) {
      passengers = booking.passengers as Passenger[];
    } else if (typeof booking.passengers === 'string') {
      try {
        const parsed = JSON.parse(booking.passengers);
        passengers = Array.isArray(parsed) ? parsed : [];
      } catch {
        passengers = [];
      }
    }
  }

  const originCode = slice?.origin?.iata_code || booking.origin;
  const destCode = slice?.destination?.iata_code || booking.destination;
  const originCity = slice?.origin?.city_name || slice?.origin?.name || booking.origin;
  const destCity = slice?.destination?.city_name || slice?.destination?.name || booking.destination;
  const flightNumber = firstSegment?.marketing_carrier_flight_number 
    ? `${firstSegment.marketing_carrier.iata_code}${firstSegment.marketing_carrier_flight_number}`
    : booking.reference || "—";

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/flights"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to bookings
      </Link>

      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-white/5 text-blue-400 border border-blue-500/20">
            {flightNumber}
          </span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-sm font-medium text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            Download
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-sm font-medium text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            Share
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Route Title */}
      <h1 className="text-5xl font-bold text-white">
        {originCode} <span className="text-zinc-500">→</span> {destCode}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Flight Timeline */}
        <div className="rounded-3xl bg-white/5 border border-white/5 p-6 md:p-8">
          {/* Origin */}
          <div className="flex gap-4 items-start">
            <div className="w-40 h-24 rounded-2xl overflow-hidden flex-shrink-0">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url('${getDestinationImage(originCode)}')` }}
              />
            </div>
            <div className="flex-1 flex justify-between items-start pt-1">
              <div>
                <h3 className="text-lg font-semibold text-white">{originCity}</h3>
                <p className="text-sm text-zinc-500">
                  {slice?.origin?.name || originCode}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">
                  {firstSegment ? formatTime(firstSegment.departing_at) : "—"}
                </p>
                <p className="text-sm text-zinc-500">
                  {firstSegment ? formatDate(firstSegment.departing_at) : formatDate(booking.departureDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Duration Line */}
          <div className="flex items-center my-4 ml-20">
            <div className="flex flex-col items-center">
              <div className="w-px h-6 border-l border-dashed border-zinc-600" />
              <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-white/10 my-2">
                {slice?.duration ? formatDuration(slice.duration) : "—"}
              </span>
              <div className="w-px h-6 border-l border-dashed border-zinc-600" />
            </div>
          </div>

          {/* Destination */}
          <div className="flex gap-4 items-start">
            <div className="w-40 h-24 rounded-2xl overflow-hidden flex-shrink-0">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url('${getDestinationImage(destCode)}')` }}
              />
            </div>
            <div className="flex-1 flex justify-between items-start pt-1">
              <div>
                <h3 className="text-lg font-semibold text-white">{destCity}</h3>
                <p className="text-sm text-zinc-500">
                  {slice?.destination?.name || destCode}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">
                  {lastSegment ? formatTime(lastSegment.arriving_at) : "—"}
                </p>
                <p className="text-sm text-zinc-500">
                  {lastSegment ? formatDate(lastSegment.arriving_at) : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Map */}
        <div className="rounded-3xl bg-zinc-800/50 border border-white/5 overflow-hidden relative min-h-[300px]">
          <FlightMap
            originCode={originCode}
            destinationCode={destCode}
            originCity={originCity}
            destinationCity={destCity}
          />
        </div>
      </div>

      {/* Bottom Row - Passengers, Baggage, What to Visit */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Passengers */}
        <div className="rounded-3xl bg-white/5 border border-white/5 p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Passengers</span>
          </div>
          <div className="space-y-3">
            {passengers.length > 0 ? (
              passengers.map((passenger) => (
                <div key={`${passenger.type}-${passenger.firstName || ''}-${passenger.lastName || ''}`} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium text-sm overflow-hidden">
                    {passenger.firstName?.[0] || passenger.type[0].toUpperCase()}
                    {passenger.lastName?.[0] || ""}
                  </div>
                  <span className="text-sm font-medium text-white">
                    {passenger.firstName && passenger.lastName
                      ? `${passenger.firstName} ${passenger.lastName}`
                      : passenger.type.replace("_", " ")}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No passenger details</p>
            )}
          </div>
        </div>

        {/* Baggage */}
        <div className="rounded-3xl bg-white/5 border border-white/5 p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Baggage</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Hand luggage:</span>
              <span className="text-sm font-medium text-white">include</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Luggage:</span>
              <span className="text-sm font-medium text-white">20kg</span>
            </div>
          </div>
        </div>

        {/* What to Visit Card */}
        <div className="rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 flex flex-col justify-between min-h-[160px]">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              What to visit in {destCity}
            </h3>
            <p className="text-sm text-blue-100/80">
              See a selection from local guides, where to dine, what must-see sights
            </p>
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="button"
              className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white hover:bg-zinc-800 transition-colors"
            >
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Boarding Pass Ticket & Offer Card - Two Separate Cards */}
      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        
        {/* Boarding Pass Ticket */}
        <div className="flex-1 relative">
          {/* Ticket shape with notches */}
          <div className="relative bg-white rounded-3xl overflow-hidden">
            {/* Left notch */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-[#09090b] rounded-full" />
            {/* Right notch */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 bg-[#09090b] rounded-full" />
            
            <div className="flex flex-col md:flex-row">
              {/* Left Section - QR Code */}
              <div className="p-8 flex items-center justify-center md:border-r-2 md:border-dashed md:border-zinc-200 relative">
                <div className="w-32 h-32">
                  {/* QR Code Pattern */}
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <rect fill="black" width="100" height="100"/>
                    <rect fill="white" x="4" y="4" width="92" height="92"/>
                    {/* QR Code corner patterns */}
                    <rect fill="black" x="8" y="8" width="24" height="24"/>
                    <rect fill="white" x="12" y="12" width="16" height="16"/>
                    <rect fill="black" x="16" y="16" width="8" height="8"/>
                    
                    <rect fill="black" x="68" y="8" width="24" height="24"/>
                    <rect fill="white" x="72" y="12" width="16" height="16"/>
                    <rect fill="black" x="76" y="16" width="8" height="8"/>
                    
                    <rect fill="black" x="8" y="68" width="24" height="24"/>
                    <rect fill="white" x="12" y="72" width="16" height="16"/>
                    <rect fill="black" x="16" y="76" width="8" height="8"/>
                    
                    {/* QR Code data pattern */}
                    <rect fill="black" x="36" y="8" width="4" height="4"/>
                    <rect fill="black" x="44" y="8" width="4" height="4"/>
                    <rect fill="black" x="52" y="8" width="4" height="4"/>
                    <rect fill="black" x="36" y="16" width="4" height="4"/>
                    <rect fill="black" x="48" y="16" width="4" height="4"/>
                    <rect fill="black" x="56" y="16" width="4" height="4"/>
                    <rect fill="black" x="40" y="24" width="4" height="4"/>
                    <rect fill="black" x="52" y="24" width="4" height="4"/>
                    
                    <rect fill="black" x="8" y="36" width="4" height="4"/>
                    <rect fill="black" x="16" y="36" width="4" height="4"/>
                    <rect fill="black" x="8" y="44" width="4" height="4"/>
                    <rect fill="black" x="20" y="44" width="4" height="4"/>
                    <rect fill="black" x="8" y="52" width="4" height="4"/>
                    <rect fill="black" x="16" y="56" width="4" height="4"/>
                    
                    <rect fill="black" x="36" y="36" width="28" height="28" rx="2"/>
                    <rect fill="white" x="40" y="40" width="20" height="20" rx="1"/>
                    <rect fill="black" x="46" y="46" width="8" height="8"/>
                    
                    <rect fill="black" x="68" y="36" width="4" height="4"/>
                    <rect fill="black" x="76" y="40" width="4" height="4"/>
                    <rect fill="black" x="84" y="36" width="4" height="4"/>
                    <rect fill="black" x="72" y="48" width="4" height="4"/>
                    <rect fill="black" x="80" y="52" width="4" height="4"/>
                    <rect fill="black" x="88" y="44" width="4" height="4"/>
                    
                    <rect fill="black" x="68" y="68" width="4" height="4"/>
                    <rect fill="black" x="76" y="72" width="4" height="4"/>
                    <rect fill="black" x="84" y="68" width="4" height="4"/>
                    <rect fill="black" x="72" y="80" width="4" height="4"/>
                    <rect fill="black" x="80" y="84" width="4" height="4"/>
                    <rect fill="black" x="88" y="76" width="4" height="4"/>
                    
                    <rect fill="black" x="36" y="68" width="4" height="4"/>
                    <rect fill="black" x="44" y="72" width="4" height="4"/>
                    <rect fill="black" x="52" y="68" width="4" height="4"/>
                    <rect fill="black" x="40" y="80" width="4" height="4"/>
                    <rect fill="black" x="48" y="88" width="4" height="4"/>
                    <rect fill="black" x="56" y="84" width="4" height="4"/>
                  </svg>
                </div>
                {/* Vertical dotted line on mobile */}
                <div className="absolute bottom-0 left-8 right-8 border-b-2 border-dashed border-zinc-200 md:hidden" />
              </div>

              {/* Right Section - Flight Details */}
              <div className="flex-1 p-8">
                {/* Airline and Flight Number */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    {firstSegment?.marketing_carrier?.logo_symbol_url ? (
                      <Image 
                        src={firstSegment.marketing_carrier.logo_symbol_url} 
                        alt={firstSegment.marketing_carrier.name || "Airline"}
                        width={20}
                        height={20}
                        className="h-5 w-auto"
                        unoptimized
                      />
                    ) : null}
                    <span className="text-base font-medium text-zinc-700">
                      {firstSegment?.marketing_carrier?.name || "Airline"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Flight number</p>
                    <p className="text-base font-bold text-zinc-900">{flightNumber}</p>
                  </div>
                </div>

                {/* Route */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-4xl font-bold text-zinc-900 tracking-tight">{originCode}</p>
                    <p className="text-sm text-zinc-500">{originCity}</p>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center px-6">
                    <div className="flex items-center w-full max-w-[180px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                      <div className="flex-1 border-t-2 border-dashed border-zinc-300 relative">
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1">
                          <svg className="w-4 h-4 text-zinc-500 rotate-90" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                          </svg>
                        </div>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-4xl font-bold text-zinc-900 tracking-tight">{destCode}</p>
                    <p className="text-sm text-zinc-500">{destCity}</p>
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="flex justify-center mb-6">
                  <span className="px-3 py-1 rounded-full bg-zinc-100 text-xs font-medium text-zinc-600">
                    {slice?.duration ? formatDuration(slice.duration) : "—"}
                  </span>
                </div>

                {/* Details Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-zinc-100">
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-0.5">Date</p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {firstSegment ? formatDate(firstSegment.departing_at) : formatDate(booking.departureDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-0.5">Boarding</p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {firstSegment ? formatTime(firstSegment.departing_at) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-0.5">Passenger</p>
                    <p className="text-sm font-semibold text-zinc-900">
                      {passengers[0]?.firstName && passengers[0]?.lastName 
                        ? `${passengers[0].firstName} ${passengers[0].lastName}`
                        : "Passenger"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-0.5">Seat</p>
                    <p className="text-sm font-semibold text-zinc-900">—</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Offer Card - Separate */}
        <div className="w-full lg:w-72 bg-zinc-900 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden min-h-[200px]">
          {/* Plane Graphic */}
          <div className="absolute inset-0 flex items-start justify-center pt-6">
            <svg viewBox="0 0 200 120" className="w-full max-w-[180px] opacity-40">
              <path 
                d="M20 100 Q 100 20, 180 100" 
                stroke="white" 
                strokeWidth="1.5" 
                fill="none" 
                strokeDasharray="4,4"
              />
              <g transform="translate(130, 45) rotate(-30)">
                <path 
                  d="M-15 0 L10 0 L12 -8 L16 -8 L16 -3 L35 -3 L35 3 L16 3 L16 8 L12 8 L10 0 L-15 0 M-5 -4 L-5 4 L0 4 L0 -4 Z" 
                  fill="white"
                />
              </g>
            </svg>
          </div>
          
          {/* Heart Icon */}
          <button type="button" className="absolute top-5 right-5 w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-white transition-colors z-10">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          <div className="mt-auto relative z-10">
            <h3 className="text-xl font-bold text-white mb-2">OFFER CARD</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Choosing a seat on the plane. By the window or in the aisle, all our seats are comfortable
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
