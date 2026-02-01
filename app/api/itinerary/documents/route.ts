import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createDocument, getDocument } from "@/lib/itinerary-chat";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Use service role for fetching all user data
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Retry helper for network resilience
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 500
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError;
}

// GET /api/itinerary/documents - List user's documents
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    // If slug provided, get specific document
    if (slug) {
      const document = await getDocument(slug);
      if (!document) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ document });
    }

    // Otherwise list all user's documents with days and activity counts
    // Use retry logic for network resilience
    const { data: documents, error } = await withRetry(async () => {
      return await supabase
        .from("itinerary_documents")
        .select(`
          *,
          days:itinerary_days(
            id,
            day_number,
            activities:itinerary_activities(id)
          )
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
    });

    if (error) {
      console.error("Error fetching documents:", error);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST /api/itinerary/documents - Create a new document manually
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const document = await createDocument(session.user.id, body);

    return NextResponse.json({ document });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
