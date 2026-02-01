import { Sidebar } from "@/components/sidebar";
import { BackgroundGradients } from "@/components/background-gradients";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";
import { BookingDetail } from "@/components/flights/booking-detail";
import { createServerSupabase } from "@/lib/supabase";
import type { Booking } from "@/lib/types/booking";

// Enable dynamic rendering but with caching
export const dynamic = "force-dynamic";
export const revalidate = 300; // Revalidate every 5 minutes

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getBooking(id: string): Promise<Booking | null> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("booking")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error || !data) return null;
    return data as Booking;
  } catch {
    return null;
  }
}

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const booking = await getBooking(id);

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b]">
      <Sidebar />

      <main className="flex-1 min-w-0 h-screen overflow-y-auto relative scrollbar-hide transition-all duration-300">
        <BackgroundGradients />

        <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10">
          <BookingDetail bookingId={id} initialBooking={booking} />
        </div>
      </main>

      <MobileNavToggle />
    </div>
  );
}
