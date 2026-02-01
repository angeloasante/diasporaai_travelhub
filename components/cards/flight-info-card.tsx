import Link from "next/link";
import { PlaneIcon, SearchIcon } from "lucide-react";

interface FlightInfoCardProps {
  destination?: string | null;
  month?: string | null;
  day?: number | null;
  time?: string | null;
  airline?: string | null;
  bookingId?: string | null;
  isEmpty?: boolean;
}

export function FlightInfoCard({
  destination,
  month,
  day,
  time,
  airline,
  bookingId,
  isEmpty = false,
}: FlightInfoCardProps) {
  // Empty state
  if (isEmpty || !destination || !month || !day) {
    return (
      <Link 
        href="/flights"
        className="md:col-span-2 h-auto min-h-[180px] rounded-[32px] bg-[#0f0f11] border border-white/5 p-8 flex items-center gap-6 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300"
      >
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-white/5 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:border-blue-500/30 transition-colors">
          <PlaneIcon className="w-7 h-7 text-zinc-500 group-hover:text-blue-400 transition-colors" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-white mb-1">No flights booked</h3>
          <p className="text-sm text-zinc-400 mb-3">
            Search and book flights to your dream destinations
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium group-hover:bg-blue-500/20 transition-colors">
            <SearchIcon className="w-4 h-4" />
            Search Flights
          </div>
        </div>
      </Link>
    );
  }

  // Link to specific booking detail page if ID available
  const detailUrl = bookingId ? `/flights/${bookingId}` : "/flights";

  return (
    <Link 
      href={detailUrl}
      className="md:col-span-2 h-auto min-h-[180px] rounded-[32px] bg-[#0f0f11] border border-white/5 p-8 flex items-center gap-6 relative overflow-hidden hover:border-white/10 transition-colors"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#141416] border border-white/5 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          {month}
        </span>
        <span className="text-2xl font-bold text-white">{day}</span>
      </div>
      <div>
        <h3 className="text-lg font-medium text-white mb-1">
          Flight to {destination}
        </h3>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {time || "Time TBD"} • {airline || "Airline"}
        </div>
      </div>
    </Link>
  );
}
