import Link from "next/link";
import { MapPinIcon, PlusIcon } from "lucide-react";

interface UpcomingTripCardProps {
  destination?: string | null;
  countryCode?: string | null;
  imageUrl?: string | null;
  slug?: string | null;
  isEmpty?: boolean;
}

export function UpcomingTripCard({
  destination,
  countryCode,
  imageUrl,
  slug,
  isEmpty = false,
}: UpcomingTripCardProps) {
  // Empty state
  if (isEmpty || !destination) {
    return (
      <Link 
        href="/itinerary"
        className="group md:col-span-2 relative h-[340px] rounded-[32px] overflow-hidden border border-white/5 bg-[#0f0f11] hover:border-blue-500/30 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
        
        <div className="absolute inset-0 p-8 flex flex-col items-center justify-center z-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 group-hover:border-blue-500/30 transition-colors">
            <MapPinIcon className="w-8 h-8 text-zinc-500 group-hover:text-blue-400 transition-colors" />
          </div>
          
          <h3 className="text-xl font-semibold text-white mb-2">No trips planned yet</h3>
          <p className="text-sm text-zinc-400 mb-4 max-w-xs">
            Plan your next adventure with our AI-powered itinerary builder
          </p>
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium group-hover:bg-blue-500/20 transition-colors">
            <PlusIcon className="w-4 h-4" />
            Create Itinerary
          </div>
        </div>
      </Link>
    );
  }

  // Default image if none provided
  const bgImage = imageUrl || "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=2662&auto=format&fit=crop";
  const detailUrl = slug ? `/itinerary/${slug}` : "/itinerary";

  return (
    <Link 
      href={detailUrl}
      className="group md:col-span-2 relative h-[340px] rounded-[32px] overflow-hidden border border-white/5 bg-[#0f0f11] hover:border-white/10 transition-colors"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 grayscale brightness-[0.4]"
        style={{ backgroundImage: `url('${bgImage}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
        <div className="flex justify-end">
          <div className="w-12 h-12 rounded-full bg-black/40 border border-white/10 backdrop-blur-md flex items-center justify-center group-hover:border-blue-500/30 transition-colors">
            <span className="text-xs font-bold tracking-widest text-blue-400">
              {countryCode || "??"}
            </span>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 group-hover:bg-black/60 transition-colors duration-300">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
              Upcoming Trip
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            {destination}
          </h2>
        </div>
      </div>
    </Link>
  );
}
