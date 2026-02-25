import { createServerSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    // Get the current user's session
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ bookings: [], message: "Not authenticated" });
    }

    const userId = session.user.id;
    const supabase = createServerSupabase();

    // Only fetch bookings for the currently signed-in user
    const { data: bookings, error } = await supabase
      .from("booking")
      .select("*")
      .eq("userId", userId)
      .in("status", ["ticketed", "processing", "pending_payment", "failed", "refunded", "refund_pending"])
      .order("createdAt", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching bookings for user:", userId, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
