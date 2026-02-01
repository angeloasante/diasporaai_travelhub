"use client";

import { Sidebar } from "@/components/sidebar";
import { BackgroundGradients } from "@/components/background-gradients";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";
import { FeaturesFooter } from "@/components/features-footer";
import {
  UpcomingTripCard,
  VisaProgressCard,
  CountdownCard,
  FlightInfoCard,
  PriceTrendsChart,
} from "@/components/cards";
import { useDashboard } from "@/hooks/use-dashboard";
import { Loader2 } from "lucide-react";

const priceData = [
  { month: "Mar", height: 40, price: 850, highlighted: true },
  { month: "", height: 30 },
  { month: "", height: 55 },
  { month: "", height: 45 },
  { month: "", height: 35 },
];

// Helper to parse flight departure time
function parseFlightDateTime(departureTime: string | undefined) {
  if (!departureTime) return { month: null, day: null, time: null };
  
  try {
    const date = new Date(departureTime);
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    const time = date.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
    return { month, day, time };
  } catch {
    return { month: null, day: null, time: null };
  }
}

// Helper to get country code from destination
function getCountryCode(destination: string | undefined): string {
  if (!destination) return "";
  
  // Simple mapping for common African destinations
  const countryMap: Record<string, string> = {
    ghana: "GH",
    nigeria: "NG",
    kenya: "KE",
    "south africa": "ZA",
    ethiopia: "ET",
    morocco: "MA",
    egypt: "EG",
    tanzania: "TZ",
    senegal: "SN",
    accra: "GH",
    lagos: "NG",
    nairobi: "KE",
    johannesburg: "ZA",
    "addis ababa": "ET",
    casablanca: "MA",
    cairo: "EG",
    "dar es salaam": "TZ",
    dakar: "SN",
  };
  
  const lower = destination.toLowerCase();
  for (const [key, code] of Object.entries(countryMap)) {
    if (lower.includes(key)) return code;
  }
  return destination.substring(0, 2).toUpperCase();
}

export default function Home() {
  const { data, isLoading, error } = useDashboard();

  // Parse flight data
  const flightDateTime = data?.upcomingFlight 
    ? parseFlightDateTime(data.upcomingFlight.departureTime || data.upcomingFlight.departureDate)
    : { month: null, day: null, time: null };

  // Get destination for trip card
  const tripDestination = data?.upcomingItinerary?.destination || 
    data?.upcomingFlight?.destination || 
    null;

  const tripCountryCode = tripDestination 
    ? getCountryCode(tripDestination)
    : null;

  const tripImage = data?.upcomingItinerary?.coverImage || null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b]">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto relative scrollbar-hide transition-all duration-300">
        <BackgroundGradients />

        <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-zinc-400">Loading your dashboard...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex items-center justify-center h-[400px]">
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-sm text-zinc-400">{error}</p>
              </div>
            </div>
          )}

          {/* Content */}
          {!isLoading && !error && (
            <>
              {/* Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)]">
                {/* Upcoming Trip Card (Large) */}
                <UpcomingTripCard
                  destination={tripDestination}
                  countryCode={tripCountryCode}
                  imageUrl={tripImage}
                  slug={data?.upcomingItinerary?.slug ?? null}
                  isEmpty={!tripDestination}
                />

                {/* Visa Application Progress */}
                <VisaProgressCard 
                  percentage={data?.activeVisaApplication?.progress ?? null}
                  country={data?.activeVisaApplication?.country ?? null}
                  applicationId={data?.activeVisaApplication?.id ?? null}
                  isEmpty={!data?.activeVisaApplication}
                />

                {/* Countdown Timer */}
                <CountdownCard 
                  daysUntilTrip={data?.daysUntilTrip ?? null}
                  bookingId={data?.upcomingFlight?.id ?? null}
                  itinerarySlug={data?.upcomingItinerary?.slug ?? null}
                  isEmpty={data?.daysUntilTrip === null}
                />

                {/* Flight Info */}
                <FlightInfoCard
                  destination={data?.upcomingFlight?.destination ?? null}
                  month={flightDateTime.month}
                  day={flightDateTime.day}
                  time={flightDateTime.time}
                  airline={data?.upcomingFlight?.airline ?? null}
                  bookingId={data?.upcomingFlight?.id ?? null}
                  isEmpty={!data?.upcomingFlight}
                />

                {/* Price Trends Chart */}
                <PriceTrendsChart
                  title="Flight Price Trends"
                  subtitle="Low Season"
                  bars={priceData}
                />
              </div>

              <FeaturesFooter />
            </>
          )}
        </div>
      </main>

      <MobileNavToggle />
    </div>
  );
}
