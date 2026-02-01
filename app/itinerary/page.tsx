import { Sidebar } from "@/components/sidebar";
import { BackgroundGradients } from "@/components/background-gradients";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";
import { TripPlanner } from "@/components/itinerary/trip-planner";

export default function ItineraryPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b]">
      <Sidebar />

      <main className="flex-1 min-w-0 h-screen overflow-y-auto relative scrollbar-hide bg-[#0e0e10] transition-all duration-300">
        <BackgroundGradients />

        <div className="w-full max-w-[1800px] mx-auto p-6 lg:p-10">
          <TripPlanner />
        </div>
      </main>

      <MobileNavToggle />
    </div>
  );
}
