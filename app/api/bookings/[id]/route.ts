import { createServerSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the current user's session
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;
    const supabase = createServerSupabase();

    // Only fetch the booking if it belongs to the current user
    const { data: booking, error } = await supabase
      .from("booking")
      .select("*")
      .eq("id", id)
      .eq("userId", userId)
      .single();

    if (error) {
      console.error("Error fetching booking:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Return with caching headers for better performance
    return NextResponse.json(
      { booking },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}
