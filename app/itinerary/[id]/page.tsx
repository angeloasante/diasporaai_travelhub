import { Sidebar } from "@/components/sidebar";
import { BackgroundGradients } from "@/components/background-gradients";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";
import { ItineraryDetail } from "@/components/itinerary/itinerary-detail";

// Enable dynamic rendering but with caching
export const dynamic = "force-dynamic";
export const revalidate = 300; // Revalidate every 5 minutes

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItineraryDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b]">
      <Sidebar />

      <main className="flex-1 min-w-0 h-screen overflow-hidden relative bg-[#0e0e10] transition-all duration-300">
        <BackgroundGradients />
        <ItineraryDetail itineraryId={id} />
      </main>

      <MobileNavToggle />
    </div>
  );
}
