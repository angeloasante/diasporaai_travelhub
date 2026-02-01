import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { geocodeLocation } from "@/lib/geocoding";

// Use service role for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// POST /api/itinerary/geocode - Geocode activities for a document
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, slug } = body;

    if (!documentId && !slug) {
      return NextResponse.json(
        { error: "Document ID or slug is required" },
        { status: 400 }
      );
    }

    // Get the document
    let document: { id: string; destination: string } | null = null;
    if (documentId) {
      const { data, error } = await supabase
        .from("itinerary_documents")
        .select("id, destination")
        .eq("id", documentId)
        .single();
      
      if (error || !data) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      document = data;
    } else {
      const { data, error } = await supabase
        .from("itinerary_documents")
        .select("id, destination")
        .eq("slug", slug)
        .single();
      
      if (error || !data) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      document = data;
    }

    // Get all activities for this document that need geocoding
    const { data: days, error: daysError } = await supabase
      .from("itinerary_days")
      .select("id")
      .eq("document_id", document.id);

    if (daysError || !days) {
      return NextResponse.json({ error: "Failed to fetch days" }, { status: 500 });
    }

    const dayIds = days.map(d => d.id);

    // Check if we should force re-geocode all activities
    const forceReGeocode = body.force === true;

    // Get activities - either all (for force) or just ones without valid coordinates
    let activities: Array<{ id: string; title: string; location: string; latitude: number | null; longitude: number | null }> | null;
    
    if (forceReGeocode) {
      // Re-geocode ALL activities when force=true
      const { data, error } = await supabase
        .from("itinerary_activities")
        .select("id, title, location, latitude, longitude")
        .in("day_id", dayIds);
      
      if (error) {
        return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
      }
      activities = data;
    } else {
      // Only get activities without valid coordinates
      const { data, error } = await supabase
        .from("itinerary_activities")
        .select("id, title, location, latitude, longitude")
        .in("day_id", dayIds)
        .or("latitude.eq.0,latitude.is.null");
      
      if (error) {
        return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
      }
      activities = data;
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({ 
        message: "All activities already have coordinates",
        geocoded: 0 
      });
    }

    // Geocode each activity
    let geocodedCount = 0;
    const errors: string[] = [];

    for (const activity of activities) {
      if (!activity.title && !activity.location) continue;

      try {
        // Use title (place name) for geocoding as it's more accurate for finding establishments
        // Fall back to location if title is not available
        const searchQuery = activity.title || activity.location;
        const coords = await geocodeLocation(searchQuery, document.destination);
        
        if (coords) {
          const { error: updateError } = await supabase
            .from("itinerary_activities")
            .update({ 
              latitude: coords.lat, 
              longitude: coords.lng 
            })
            .eq("id", activity.id);

          if (updateError) {
            errors.push(`Failed to update activity ${activity.id}: ${updateError.message}`);
          } else {
            geocodedCount++;
            console.log(`Geocoded "${searchQuery}" -> lat: ${coords.lat}, lng: ${coords.lng}`);
          }
        } else {
          errors.push(`No coordinates found for "${searchQuery}"`);
        }
      } catch (err) {
        errors.push(`Failed to geocode "${activity.title}": ${err}`);
      }

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    return NextResponse.json({
      message: `Geocoded ${geocodedCount} of ${activities.length} activities`,
      geocoded: geocodedCount,
      total: activities.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Geocoding API error:", error);
    return NextResponse.json(
      { error: "Failed to geocode activities" },
      { status: 500 }
    );
  }
}
