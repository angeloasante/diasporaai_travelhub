import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDocument, getDocumentById } from "@/lib/itinerary-chat";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/itinerary/documents/[slug] - Get document by slug or ID
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    
    console.log("Fetching document with slug/id:", slug);

    // Try to fetch by slug first
    let document = await getDocument(slug);
    console.log("Fetch by slug result:", document ? "found" : "not found");

    // If not found by slug, try by ID
    if (!document) {
      document = await getDocumentById(slug);
      console.log("Fetch by ID result:", document ? "found" : "not found");
    }

    if (!document) {
      return NextResponse.json(
        { error: "Document not found", slug },
        { status: 404 }
      );
    }

    // Return with caching headers for better performance
    return NextResponse.json(
      { document },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}
