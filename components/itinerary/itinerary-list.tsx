"use client";

import { useState } from "react";
import Link from "next/link";
import { PlaneIcon, CalendarIcon } from "@/components/icons";

interface ItineraryEvent {
  id: string;
  type: "flight" | "hotel" | "activity" | "transfer";
  title: string;
  subtitle: string;
  time: string;
  date: string;
  location: string;
  status: "upcoming" | "ongoing" | "completed";
  details?: {
    flightNumber?: string;
    origin?: string;
    destination?: string;
    duration?: string;
    gate?: string;
    terminal?: string;
    hotelName?: string;
    checkIn?: string;
    checkOut?: string;
    activityType?: string;
  };
}

interface ItineraryDay {
  date: string;
  dayLabel: string;
  events: ItineraryEvent[];
}

// Sample itinerary data - in production this would come from bookings
const sampleItinerary: ItineraryDay[] = [
  {
    date: "2026-02-15",
    dayLabel: "Saturday, Feb 15",
    events: [
      {
        id: "1",
        type: "flight",
        title: "Lagos → London",
        subtitle: "British Airways BA075",
        time: "10:30 AM",
        date: "2026-02-15",
        location: "Murtala Muhammed International Airport",
        status: "upcoming",
        details: {
          flightNumber: "BA075",
          origin: "LOS",
          destination: "LHR",
          duration: "6h 35m",
          gate: "B12",
          terminal: "Terminal 2",
        },
      },
      {
        id: "2",
        type: "transfer",
        title: "Airport Transfer",
        subtitle: "Private car to hotel",
        time: "6:05 PM",
        date: "2026-02-15",
        location: "London Heathrow Airport",
        status: "upcoming",
      },
      {
        id: "3",
        type: "hotel",
        title: "The Ritz London",
        subtitle: "Check-in",
        time: "7:30 PM",
        date: "2026-02-15",
        location: "150 Piccadilly, London",
        status: "upcoming",
        details: {
          hotelName: "The Ritz London",
          checkIn: "3:00 PM",
          checkOut: "Feb 18, 11:00 AM",
        },
      },
    ],
  },
  {
    date: "2026-02-16",
    dayLabel: "Sunday, Feb 16",
    events: [
      {
        id: "4",
        type: "activity",
        title: "London Eye Experience",
        subtitle: "Sightseeing",
        time: "10:00 AM",
        date: "2026-02-16",
        location: "South Bank, London",
        status: "upcoming",
        details: {
          activityType: "Attraction",
        },
      },
      {
        id: "5",
        type: "activity",
        title: "Buckingham Palace Tour",
        subtitle: "Guided tour",
        time: "2:00 PM",
        date: "2026-02-16",
        location: "Westminster, London",
        status: "upcoming",
        details: {
          activityType: "Tour",
        },
      },
    ],
  },
  {
    date: "2026-02-17",
    dayLabel: "Monday, Feb 17",
    events: [
      {
        id: "6",
        type: "activity",
        title: "British Museum",
        subtitle: "Free exploration",
        time: "9:00 AM",
        date: "2026-02-17",
        location: "Great Russell St, London",
        status: "upcoming",
      },
      {
        id: "7",
        type: "activity",
        title: "West End Show - The Lion King",
        subtitle: "Theatre",
        time: "7:30 PM",
        date: "2026-02-17",
        location: "Lyceum Theatre, London",
        status: "upcoming",
      },
    ],
  },
  {
    date: "2026-02-18",
    dayLabel: "Tuesday, Feb 18",
    events: [
      {
        id: "8",
        type: "hotel",
        title: "The Ritz London",
        subtitle: "Check-out",
        time: "11:00 AM",
        date: "2026-02-18",
        location: "150 Piccadilly, London",
        status: "upcoming",
      },
      {
        id: "9",
        type: "transfer",
        title: "Airport Transfer",
        subtitle: "Private car to Heathrow",
        time: "12:00 PM",
        date: "2026-02-18",
        location: "The Ritz London",
        status: "upcoming",
      },
      {
        id: "10",
        type: "flight",
        title: "London → Lagos",
        subtitle: "British Airways BA074",
        time: "3:30 PM",
        date: "2026-02-18",
        location: "London Heathrow Airport",
        status: "upcoming",
        details: {
          flightNumber: "BA074",
          origin: "LHR",
          destination: "LOS",
          duration: "6h 25m",
          gate: "C24",
          terminal: "Terminal 5",
        },
      },
    ],
  },
];

const eventTypeIcons: Record<string, React.ReactNode> = {
  flight: <PlaneIcon className="w-5 h-5" />,
  hotel: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  activity: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  transfer: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
};

const eventTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  flight: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  hotel: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  activity: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  transfer: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
};

function EventCard({ event }: { event: ItineraryEvent }) {
  const colors = eventTypeColors[event.type];
  const icon = eventTypeIcons[event.type];

  return (
    <div className={`rounded-2xl bg-white/5 border border-white/5 p-5 hover:border-white/10 transition-all`}>
      <div className="flex gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center ${colors.text} flex-shrink-0`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h3 className="font-semibold text-white text-lg">{event.title}</h3>
              <p className="text-sm text-zinc-400">{event.subtitle}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-semibold text-white">{event.time}</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
              </span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{event.location}</span>
          </div>

          {/* Flight specific details */}
          {event.type === "flight" && event.details && (
            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase">Route</p>
                <p className="text-sm font-medium text-white">{event.details.origin} → {event.details.destination}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase">Duration</p>
                <p className="text-sm font-medium text-white">{event.details.duration}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase">Terminal</p>
                <p className="text-sm font-medium text-white">{event.details.terminal}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase">Gate</p>
                <p className="text-sm font-medium text-white">{event.details.gate}</p>
              </div>
            </div>
          )}

          {/* Hotel specific details */}
          {event.type === "hotel" && event.details && (
            <div className="mt-4 pt-4 border-t border-white/5 flex gap-6">
              <div>
                <p className="text-xs text-zinc-500 uppercase">Check-in</p>
                <p className="text-sm font-medium text-white">{event.details.checkIn}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase">Check-out</p>
                <p className="text-sm font-medium text-white">{event.details.checkOut}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DaySection({ day }: { day: ItineraryDay }) {
  return (
    <div className="mb-10">
      {/* Day Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex flex-col items-center justify-center text-white">
          <span className="text-lg font-bold leading-none">{new Date(day.date).getDate()}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-80">
            {new Date(day.date).toLocaleDateString("en-US", { month: "short" })}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">{day.dayLabel}</h2>
          <p className="text-sm text-zinc-500">{day.events.length} event{day.events.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Events Timeline */}
      <div className="relative pl-7 ml-7 border-l-2 border-dashed border-white/10 space-y-4">
        {day.events.map((event) => (
          <div key={event.id} className="relative">
            {/* Timeline dot */}
            <div className="absolute -left-[33px] top-6 w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-800" />
            <EventCard event={event} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ItineraryList() {
  const [selectedTrip, setSelectedTrip] = useState<string>("london-2026");

  // Calculate trip stats
  const totalFlights = sampleItinerary.reduce(
    (acc, day) => acc + day.events.filter((e) => e.type === "flight").length,
    0
  );
  const totalActivities = sampleItinerary.reduce(
    (acc, day) => acc + day.events.filter((e) => e.type === "activity").length,
    0
  );
  const totalDays = sampleItinerary.length;

  return (
    <div>
      {/* Trip Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <select
            value={selectedTrip}
            onChange={(e) => setSelectedTrip(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer pr-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              backgroundSize: "16px",
            }}
          >
            <option value="london-2026">London Trip - Feb 2026</option>
            <option value="dubai-2026">Dubai Trip - Mar 2026</option>
            <option value="paris-2026">Paris Trip - Apr 2026</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white hover:bg-white/5 transition-colors"
          >
            <CalendarIcon className="w-4 h-4" />
            Add Event
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* Trip Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="rounded-2xl bg-white/5 border border-white/5 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-white">{totalDays}</span>
          </div>
          <p className="text-sm text-zinc-500">Days</p>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/5 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <PlaneIcon className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold text-white">{totalFlights}</span>
          </div>
          <p className="text-sm text-zinc-500">Flights</p>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/5 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              {eventTypeIcons.hotel}
            </div>
            <span className="text-2xl font-bold text-white">1</span>
          </div>
          <p className="text-sm text-zinc-500">Hotels</p>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/5 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              {eventTypeIcons.activity}
            </div>
            <span className="text-2xl font-bold text-white">{totalActivities}</span>
          </div>
          <p className="text-sm text-zinc-500">Activities</p>
        </div>
      </div>

      {/* Trip Map Preview */}
      <div className="rounded-3xl bg-white/5 border border-white/5 p-6 mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Trip Overview</h3>
          <Link
            href="/flights"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View all bookings →
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-400">LOS</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 border-t-2 border-dashed border-zinc-600" />
              <PlaneIcon className="w-5 h-5 text-zinc-500 rotate-90" />
              <div className="w-16 border-t-2 border-dashed border-zinc-600" />
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-purple-400">LHR</span>
            </div>
          </div>
          <div className="flex-1 text-right">
            <p className="text-lg font-semibold text-white">Lagos → London</p>
            <p className="text-sm text-zinc-500">Round trip · Feb 15 - Feb 18, 2026</p>
          </div>
        </div>
      </div>

      {/* Itinerary Timeline */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-6">Daily Schedule</h3>
        {sampleItinerary.map((day) => (
          <DaySection key={day.date} day={day} />
        ))}
      </div>
    </div>
  );
}
