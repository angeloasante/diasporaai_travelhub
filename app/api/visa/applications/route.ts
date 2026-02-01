import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export interface VisaApplicationInput {
  applicant_name: string;
  email: string;
  date_of_birth?: string;
  passport_number?: string;
  phone?: string;
  origin_country: string;
  origin_country_code?: string;
  destination_country: string;
  destination_country_code?: string;
  destination_flag?: string;
  visa_type?: string;
  travel_reason?: string;
  status?: string;
  vfs_check_enabled?: boolean;
  vfs_email?: string;
  vfs_password_encrypted?: string;
  preferred_date_from?: string;
  preferred_date_to?: string;
  vfs_center?: string;
  visa_category?: string;
  visa_sub_category?: string;
  requirements?: Array<{ id: string; label: string; completed: boolean }>;
  costs?: Array<{ label: string; amount: number }>;
  referral_source?: string;
  notes?: string;
  user_id?: string;
}

// GET - Fetch all applications (optionally filter by email)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const userId = searchParams.get("userId");
    const id = searchParams.get("id");

    let query = supabase
      .from("visa_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (id) {
      query = query.eq("id", id);
    }
    if (email) {
      query = query.eq("email", email);
    }
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching applications:", error);
      return NextResponse.json(
        { error: "Failed to fetch applications", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ applications: data || [] });
  } catch (error) {
    console.error("Error in GET /api/visa/applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new application
export async function POST(request: Request) {
  try {
    const body: VisaApplicationInput = await request.json();

    // Validate required fields
    if (!body.applicant_name || !body.email || !body.origin_country || !body.destination_country) {
      return NextResponse.json(
        { error: "Missing required fields: applicant_name, email, origin_country, destination_country" },
        { status: 400 }
      );
    }

    // Generate application number
    const applicationNumber = `#${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await supabase
      .from("visa_applications")
      .insert({
        ...body,
        application_number: applicationNumber,
        status: body.status || "draft",
        visa_type: body.visa_type || "Tourist Visa",
        requirements: body.requirements || [
          { id: "1", label: "Passport Photo", completed: false },
          { id: "2", label: "Application Form", completed: false },
          { id: "3", label: "Bank Statement", completed: false },
          { id: "4", label: "Travel Itinerary", completed: false },
        ],
        costs: body.costs || [
          { label: "Embassy Fee", amount: 160 },
          { label: "Service Fee", amount: 25 },
        ],
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating application:", error);
      return NextResponse.json(
        { error: "Failed to create application", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ application: data }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/visa/applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update an existing application
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("visa_applications")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating application:", error);
      return NextResponse.json(
        { error: "Failed to update application", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ application: data });
  } catch (error) {
    console.error("Error in PATCH /api/visa/applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an application
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("visa_applications")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting application:", error);
      return NextResponse.json(
        { error: "Failed to delete application", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/visa/applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
