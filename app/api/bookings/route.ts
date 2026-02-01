import { createServerSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createServerSupabase();

    const { data: bookings, error } = await supabase
      .from("booking")
      .select("*")
      .in("status", ["ticketed", "processing", "pending_payment"])
      .order("createdAt", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching bookings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
