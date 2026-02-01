import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { CalendarIcon } from "lucide-react";

interface CountdownCardProps {
  daysUntilTrip?: number | null;
  totalDays?: number;
  bookingId?: string | null;
  itinerarySlug?: string | null;
  isEmpty?: boolean;
}

export function CountdownCard({ daysUntilTrip, totalDays = 40, bookingId, itinerarySlug, isEmpty = false }: CountdownCardProps) {
  // Empty state
  if (isEmpty || daysUntilTrip === null || daysUntilTrip === undefined) {
    return (
      <Link
        href="/flights"
        className="md:col-span-1 h-auto min-h-[180px] rounded-[32px] bg-[#0f0f11] border border-white/5 p-8 flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800/50 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-blue-500/20 group-hover:border-blue-500/30 transition-colors">
            <CalendarIcon className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
          </div>
          <div>
            <div className="text-sm font-medium text-white mb-0.5">No upcoming trips</div>
            <div className="text-xs text-zinc-500">Book a flight to start your countdown</div>
          </div>
        </div>
      </Link>
    );
  }

  const progressPercentage = Math.max(0, Math.min(100, ((totalDays - daysUntilTrip) / totalDays) * 100));
  
  // Link to specific detail page - prefer booking if available, otherwise itinerary
  const detailUrl = bookingId ? `/flights/${bookingId}` : itinerarySlug ? `/itinerary/${itinerarySlug}` : "/flights";

  return (
    <Link
      href={detailUrl}
      className="md:col-span-1 h-auto min-h-[180px] rounded-[32px] bg-[#0f0f11] border border-white/5 p-8 flex flex-col justify-center relative overflow-hidden group hover:border-white/10 transition-colors"
    >
      <div className="flex items-center gap-6">
        <button type="button" aria-label="View trip details" className="w-12 h-12 rounded-full bg-zinc-800/50 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-800 group-hover:text-white transition-colors">
          <ArrowRightIcon />
        </button>
        <div className="flex-1">
          <div className="h-2 w-full bg-zinc-800 rounded-full mb-3 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.4)]"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-blue-400">Days until trip</span>
            <span className="text-zinc-500">{daysUntilTrip} Days</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
