import { createServerSupabase } from "@/lib/supabase";
import type {
  ItineraryConversation,
  ItineraryMessage,
  ItineraryDocument,
  ItineraryAttachment,
  CreateDocumentInput,
} from "@/types/itinerary-chat";

// Use service role client to bypass RLS (since we're using NextAuth, not Supabase Auth)
const getSupabase = () => createServerSupabase();

// Generate a URL-friendly slug
function generateSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const uniqueId = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${uniqueId}`;
}

// ============================================
// CONVERSATION FUNCTIONS
// ============================================

export async function getConversations(userId: string): Promise<ItineraryConversation[]> {
  const { data, error } = await getSupabase()
    .from("itinerary_conversation_list")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }

  return data || [];
}

export async function getConversation(conversationId: string): Promise<{
  conversation: ItineraryConversation;
  messages: ItineraryMessage[];
} | null> {
  const { data: conversation, error: convError } = await getSupabase()
    .from("itinerary_conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (convError || !conversation) {
    console.error("Error fetching conversation:", convError);
    return null;
  }

  const { data: messages, error: msgError } = await getSupabase()
    .from("itinerary_messages")
    .select(`
      *,
      attachments:itinerary_attachments(*)
    `)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (msgError) {
    console.error("Error fetching messages:", msgError);
    throw msgError;
  }

  return {
    conversation,
    messages: messages || [],
  };
}

export async function createConversation(
  userId: string,
  title?: string,
  destination?: string
): Promise<ItineraryConversation> {
  const { data, error } = await getSupabase()
    .from("itinerary_conversations")
    .insert({
      user_id: userId,
      title: title || "New Conversation",
      destination,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }

  return data;
}

export async function updateConversation(
  conversationId: string,
  updates: Partial<Pick<ItineraryConversation, "title" | "destination" | "duration" | "status">>
): Promise<ItineraryConversation> {
  const { data, error } = await getSupabase()
    .from("itinerary_conversations")
    .update(updates)
    .eq("id", conversationId)
    .select()
    .single();

  if (error) {
    console.error("Error updating conversation:", error);
    throw error;
  }

  return data;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("itinerary_conversations")
    .delete()
    .eq("id", conversationId);

  if (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
}

// ============================================
// MESSAGE FUNCTIONS
// ============================================

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  metadata?: Record<string, unknown>
): Promise<ItineraryMessage> {
  const { data, error } = await getSupabase()
    .from("itinerary_messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding message:", error);
    throw error;
  }

  // Update conversation's updated_at
  await getSupabase()
    .from("itinerary_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data;
}

export async function getMessages(conversationId: string): Promise<ItineraryMessage[]> {
  const { data, error } = await getSupabase()
    .from("itinerary_messages")
    .select(`
      *,
      attachments:itinerary_attachments(*)
    `)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }

  return data || [];
}

// ============================================
// DOCUMENT FUNCTIONS
// ============================================

export async function createDocument(
  userId: string,
  input: CreateDocumentInput
): Promise<ItineraryDocument> {
  const serverSupabase = createServerSupabase();
  const slug = generateSlug(input.title);
  
  console.log("Creating document with slug:", slug);
  console.log("User ID:", userId);

  // Create the document
  const { data: document, error: docError } = await serverSupabase
    .from("itinerary_documents")
    .insert({
      user_id: userId,
      conversation_id: input.conversation_id,
      title: input.title,
      slug,
      destination: input.destination,
      country: input.country,
      country_flag: input.country_flag,
      duration: input.duration,
      description: input.description,
      dates: input.dates,
      travelers: input.travelers,
      avg_cost: input.avg_cost,
      cover_image: input.cover_image,
      status: "published",
    })
    .select()
    .single();

  if (docError) {
    console.error("Error creating document:", docError);
    throw docError;
  }
  
  console.log("Document created successfully:", document.id, document.slug);

  // Create days and activities
  for (const day of input.days) {
    const { data: dayData, error: dayError } = await serverSupabase
      .from("itinerary_days")
      .insert({
        document_id: document.id,
        day_number: day.day_number,
        date: day.date,
        title: day.title,
        description: day.description,
      })
      .select()
      .single();

    if (dayError) {
      console.error("Error creating day:", dayError);
      continue;
    }

    // Create activities for this day
    if (day.activities && day.activities.length > 0) {
      // Try with full Google Places fields first
      const fullActivities = day.activities.map((activity, index) => ({
        day_id: dayData.id,
        time: activity.time,
        title: activity.title,
        type: activity.type,
        location: activity.location,
        description: activity.description,
        price: activity.price,
        price_note: activity.price_note,
        image: activity.image,
        latitude: activity.latitude,
        longitude: activity.longitude,
        booking_url: activity.booking_url,
        action_label: activity.action_label,
        sort_order: index,
        // Google Places enrichment fields
        place_id: activity.placeId,
        rating: activity.rating,
        user_ratings_total: activity.userRatingsTotal,
        price_level: activity.priceLevel,
        photos: activity.photos,
        open_now: activity.openNow,
        opening_hours: activity.openingHours,
        website: activity.website,
        phone_number: activity.phoneNumber,
        google_maps_url: activity.googleMapsUrl,
        editorial_summary: activity.editorialSummary,
        top_review: activity.topReview ? {
          author_name: activity.topReview.authorName,
          rating: activity.topReview.rating,
          text: activity.topReview.text,
        } : null,
      }));

      const { error: actError } = await serverSupabase
        .from("itinerary_activities")
        .insert(fullActivities);

      // If error is about missing columns, fall back to basic fields only
      if (actError && actError.code === 'PGRST204') {
        console.log("Google Places columns not found, falling back to basic fields...");
        
        const basicActivities = day.activities.map((activity, index) => ({
          day_id: dayData.id,
          time: activity.time,
          title: activity.title,
          type: activity.type,
          location: activity.location,
          description: activity.editorialSummary || activity.description, // Use enriched description
          price: activity.price,
          price_note: activity.price_note,
          image: activity.image, // This will have the Google Places photo URL
          latitude: activity.latitude,
          longitude: activity.longitude,
          booking_url: activity.booking_url,
          action_label: activity.action_label,
          sort_order: index,
        }));

        const { error: basicError } = await serverSupabase
          .from("itinerary_activities")
          .insert(basicActivities);

        if (basicError) {
          console.error("Error creating activities (basic):", basicError);
        }
      } else if (actError) {
        console.error("Error creating activities:", actError);
      }
    }
  }

  return { ...document, slug };
}

export async function getDocument(slug: string): Promise<ItineraryDocument | null> {
  console.log("getDocument called with slug:", slug);
  
  // First get the document
  const { data: docs, error: docError } = await getSupabase()
    .from("itinerary_documents")
    .select("*")
    .eq("slug", slug)
    .limit(1);

  console.log("getDocument result:", { found: docs?.length || 0, error: docError });

  if (docError) {
    console.error("Error fetching document:", docError);
    return null;
  }
  
  const doc = docs?.[0];
  if (!doc) {
    console.log("No document found with slug:", slug);
    return null;
  }

  // Get days with activities
  const { data: days, error: daysError } = await getSupabase()
    .from("itinerary_days")
    .select(`
      *,
      activities:itinerary_activities(*)
    `)
    .eq("document_id", doc.id)
    .order("day_number", { ascending: true });

  if (daysError) {
    console.error("Error fetching days:", daysError);
  }

  // Sort activities within each day
  const sortedDays = days?.map(day => ({
    ...day,
    activities: day.activities?.sort((a: { sort_order?: number; time?: string }, b: { sort_order?: number; time?: string }) => 
      (a.sort_order || 0) - (b.sort_order || 0) || (a.time || '').localeCompare(b.time || '')
    )
  })) || [];

  return {
    ...doc,
    days: sortedDays
  };
}

export async function getDocumentById(documentId: string): Promise<ItineraryDocument | null> {
  console.log("getDocumentById called with ID:", documentId);
  
  // First get the document
  const { data: docs, error: docError } = await getSupabase()
    .from("itinerary_documents")
    .select("*")
    .eq("id", documentId)
    .limit(1);

  console.log("getDocumentById result:", { found: docs?.length || 0, error: docError });

  if (docError) {
    console.error("Error fetching document by ID:", docError);
    return null;
  }
  
  const doc = docs?.[0];
  if (!doc) {
    console.log("No document found with ID:", documentId);
    return null;
  }

  // Get days with activities
  const { data: days, error: daysError } = await getSupabase()
    .from("itinerary_days")
    .select(`
      *,
      activities:itinerary_activities(*)
    `)
    .eq("document_id", doc.id)
    .order("day_number", { ascending: true });

  if (daysError) {
    console.error("Error fetching days:", daysError);
  }

  // Sort activities within each day
  const sortedDays = days?.map(day => ({
    ...day,
    activities: day.activities?.sort((a: { sort_order?: number; time?: string }, b: { sort_order?: number; time?: string }) => 
      (a.sort_order || 0) - (b.sort_order || 0) || (a.time || '').localeCompare(b.time || '')
    )
  })) || [];

  return {
    ...doc,
    days: sortedDays
  };
}

export async function getUserDocuments(userId: string): Promise<ItineraryDocument[]> {
  const { data, error } = await getSupabase()
    .from("itinerary_documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user documents:", error);
    throw error;
  }

  return data || [];
}

// ============================================
// ATTACHMENT FUNCTIONS
// ============================================

export async function addAttachment(
  messageId: string,
  documentId: string,
  title: string,
  previewData?: ItineraryAttachment["preview_data"]
): Promise<ItineraryAttachment> {
  const { data, error } = await getSupabase()
    .from("itinerary_attachments")
    .insert({
      message_id: messageId,
      document_id: documentId,
      type: "itinerary",
      title,
      preview_data: previewData || {},
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding attachment:", error);
    throw error;
  }

  return data;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function getOrCreateConversation(
  userId: string,
  conversationId?: string
): Promise<ItineraryConversation> {
  if (conversationId) {
    const result = await getConversation(conversationId);
    if (result?.conversation) {
      return result.conversation;
    }
  }

  return createConversation(userId);
}
