import { Sidebar } from "@/components/sidebar";
import { BackgroundGradients } from "@/components/background-gradients";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";
import { BookingsList } from "@/components/flights/bookings-list";

// Cache this page for 30 seconds
export const revalidate = 30;

export default function FlightsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b]">
      <Sidebar />

      <main className="flex-1 min-w-0 h-screen overflow-y-auto relative scrollbar-hide transition-all duration-300">
        <BackgroundGradients />

        <div className="w-full max-w-[1200px] mx-auto p-6 lg:p-10">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              My Bookings
            </h1>
            <p className="text-zinc-400">
              View and manage all your flight bookings
            </p>
          </div>

          {/* Bookings List */}
          <BookingsList />
        </div>
      </main>

      <MobileNavToggle />
    </div>
  );
}
