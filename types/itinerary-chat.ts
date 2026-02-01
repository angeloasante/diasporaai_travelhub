// Itinerary Chat Types

export interface ItineraryConversation {
  id: string;
  user_id: string;
  title: string;
  destination?: string;
  duration?: string;
  status: "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
  last_message?: string;
  message_count?: number;
  document_count?: number;
}

export interface ItineraryMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  attachments?: ItineraryAttachment[];
}

export interface ItineraryAttachment {
  id: string;
  message_id: string;
  document_id?: string;
  type: "itinerary" | "image" | "file";
  title?: string;
  preview_data?: {
    destination?: string;
    duration?: string;
    days?: number;
    cover_image?: string;
  };
  created_at: string;
}

export interface ItineraryDocument {
  id: string;
  user_id: string;
  conversation_id?: string;
  title: string;
  slug: string;
  destination: string;
  country?: string;
  country_flag?: string;
  duration: string;
  description?: string;
  dates?: string;
  travelers?: string;
  avg_cost?: string;
  cover_image?: string;
  status: "draft" | "published" | "archived";
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  days?: ItineraryDay[];
}

export interface ItineraryDay {
  id: string;
  document_id: string;
  day_number: number;
  date?: string;
  title: string;
  description?: string;
  activities?: ItineraryActivity[];
}

export interface ItineraryActivity {
  id: string;
  day_id: string;
  time?: string;
  title: string;
  type: "flight" | "hotel" | "restaurant" | "attraction" | "transport" | "other";
  location?: string;
  description?: string;
  price?: string;
  price_note?: string;
  image?: string;
  latitude?: number;
  longitude?: number;
  booking_url?: string;
  action_label?: string;
  metadata?: Record<string, unknown>;
  sort_order?: number;
  // Google Places enrichment fields
  place_id?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: string[];
  open_now?: boolean;
  opening_hours?: string[];
  website?: string;
  phone_number?: string;
  google_maps_url?: string;
  editorial_summary?: string;
  top_review?: {
    author_name: string;
    rating: number;
    text: string;
  };
}

// API Response types
export interface ConversationListResponse {
  conversations: ItineraryConversation[];
  total: number;
}

export interface ConversationDetailResponse {
  conversation: ItineraryConversation;
  messages: ItineraryMessage[];
}

export interface CreateDocumentInput {
  conversation_id?: string;
  title: string;
  destination: string;
  country?: string;
  country_flag?: string;
  duration: string;
  description?: string;
  dates?: string;
  travelers?: string;
  avg_cost?: string;
  cover_image?: string;
  days: {
    day_number: number;
    date?: string;
    title: string;
    description?: string;
    activities: {
      time?: string;
      title: string;
      type: ItineraryActivity["type"];
      location?: string;
      description?: string;
      price?: string;
      price_note?: string;
      image?: string;
      latitude?: number;
      longitude?: number;
      booking_url?: string;
      action_label?: string;
      // Google Places enrichment fields
      placeId?: string;
      rating?: number;
      userRatingsTotal?: number;
      priceLevel?: number;
      photos?: string[];
      openNow?: boolean;
      openingHours?: string[];
      website?: string;
      phoneNumber?: string;
      googleMapsUrl?: string;
      editorialSummary?: string;
      topReview?: {
        authorName: string;
        rating: number;
        text: string;
      };
    }[];
  }[];
}
