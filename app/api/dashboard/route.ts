import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Use service role for fetching all user data
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// GET /api/dashboard - Get dashboard summary data
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Build visa query - some visa applications might be linked by email instead of userId
    let visaQuery = supabase
      .from("visa_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    // Try to get visa apps by user_id first, or by email
    if (userId) {
      visaQuery = visaQuery.or(`user_id.eq.${userId}${userEmail ? `,email.eq.${userEmail}` : ''}`);
    } else if (userEmail) {
      visaQuery = visaQuery.eq("email", userEmail);
    }

    // Fetch all data in parallel
    const [itinerariesResult, visaApplicationsResult, bookingsResult] = await Promise.all([
      // Fetch itineraries
      supabase
        .from("itinerary_documents")
        .select(`
          id,
          slug,
          title,
          destination,
          country,
          country_flag,
          duration,
          dates,
          cover_image,
          status,
          created_at,
          days:itinerary_days(
            id,
            day_number,
            activities:itinerary_activities(id)
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),

      // Fetch visa applications
      visaQuery,

      // Fetch bookings from main app's database
      // Note: Bookings are in the main ai-chatbot database, not supabase
      // We'll need to fetch from the booking API
      fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/bookings`, {
        headers: {
          Cookie: req.headers.get("cookie") || "",
        },
      }).then(res => res.ok ? res.json() : { bookings: [] }).catch(() => ({ bookings: [] })),
    ]);

    // Process itineraries
    const itineraries = (itinerariesResult.data || []).map((doc: any) => ({
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      destination: doc.destination,
      country: doc.country,
      countryFlag: doc.country_flag,
      duration: doc.duration,
      dates: doc.dates,
      coverImage: doc.cover_image,
      status: doc.status,
      activityCount: doc.days?.reduce((acc: number, day: any) => 
        acc + (day.activities?.length || 0), 0) || 0,
    }));

    // Find the upcoming itinerary (closest future date)
    const upcomingItinerary = itineraries.find((it: any) => {
      if (!it.dates) return false;
      const startDate = new Date(it.dates.split(" - ")[0]);
      return startDate > new Date();
    }) || itineraries[0] || null;

    // Process visa applications
    const visaApplications = (visaApplicationsResult.data || []).map((app: any) => ({
      id: app.id,
      country: app.destination_country,
      countryCode: app.destination_country_code,
      flagEmoji: app.destination_flag,
      visaType: app.visa_type,
      status: app.status,
      progress: calculateVisaProgress(app),
      applicationNumber: app.application_number,
    }));

    // Get the most active visa application (not approved/denied)
    const activeVisaApplication = visaApplications.find((app: any) => 
      !["approved", "denied"].includes(app.status)
    ) || visaApplications[0] || null;

    // Process bookings
    const bookings = (bookingsResult.bookings || []).map((booking: any) => ({
      id: booking.id,
      destination: booking.destination,
      origin: booking.origin,
      departureDate: booking.departureDate,
      status: booking.status,
      airline: booking.offerDetails?.slices?.[0]?.segments?.[0]?.marketing_carrier?.name || 
               booking.offerDetails?.owner?.name || "Airline",
      flightNumber: booking.offerDetails?.slices?.[0]?.segments?.[0]?.marketing_carrier_flight_number,
      departureTime: booking.offerDetails?.slices?.[0]?.segments?.[0]?.departing_at,
      totalAmount: booking.totalAmount,
      totalCurrency: booking.totalCurrency,
    }));

    // Find the upcoming flight (closest future departure)
    const upcomingFlight = bookings.find((b: any) => {
      if (!b.departureDate) return false;
      const depDate = new Date(b.departureDate);
      return depDate > new Date() && b.status === "ticketed";
    }) || bookings.find((b: any) => b.status === "ticketed") || null;

    // Calculate days until trip
    let daysUntilTrip = null;
    if (upcomingFlight?.departureDate) {
      const depDate = new Date(upcomingFlight.departureDate);
      const today = new Date();
      daysUntilTrip = Math.ceil((depDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    } else if (upcomingItinerary?.dates) {
      const startDate = new Date(upcomingItinerary.dates.split(" - ")[0]);
      const today = new Date();
      daysUntilTrip = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json(
      {
        upcomingItinerary,
        itineraries,
        activeVisaApplication,
        visaApplications,
        upcomingFlight,
        bookings,
        daysUntilTrip: daysUntilTrip !== null ? Math.max(0, daysUntilTrip) : null,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

// Calculate visa application progress based on requirements
function calculateVisaProgress(app: any): number {
  if (!app.requirements || app.requirements.length === 0) {
    // Base progress on status if no requirements
    const statusProgress: Record<string, number> = {
      draft: 20,
      submitted: 50,
      interview: 70,
      processing: 85,
      approved: 100,
      denied: 0,
    };
    return statusProgress[app.status] || 0;
  }

  const completed = app.requirements.filter((r: any) => r.completed).length;
  return Math.round((completed / app.requirements.length) * 100);
}
