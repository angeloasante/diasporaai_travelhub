/**
 * Google Places API integration for enriching itinerary activities
 * Fetches real photos, ratings, reviews, opening hours, and booking links
 */

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress?: string;
  location: {
    lat: number;
    lng: number;
  };
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number; // 0-4 scale
  photos?: PlacePhoto[];
  openingHours?: {
    openNow?: boolean;
    weekdayText?: string[];
  };
  website?: string;
  phoneNumber?: string;
  googleMapsUrl?: string;
  types?: string[];
  editorial_summary?: string;
  reviews?: PlaceReview[];
  businessStatus?: string;
}

export interface PlacePhoto {
  photoReference: string;
  height: number;
  width: number;
  url?: string; // Generated URL
  attributions?: string[];
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  relativeTimeDescription: string;
  profilePhotoUrl?: string;
}

export interface EnrichedActivity {
  title: string;
  type: "flight" | "hotel" | "restaurant" | "attraction" | "transport" | "other";
  location?: string;
  description?: string;
  time?: string;
  price?: string;
  price_note?: string;
  image?: string;
  latitude: number;
  longitude: number;
  booking_url?: string;
  action_label?: string;
  // New enriched fields
  placeId?: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  photos?: string[]; // Array of photo URLs
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
}

// Cache for place details to avoid duplicate API calls
const placeDetailsCache = new Map<string, PlaceDetails>();

/**
 * Get the Google Maps API key
 */
function getApiKey(): string | null {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_MAPS_API_KEY not set");
    return null;
  }
  return apiKey;
}

/**
 * Search for a place and get its Place ID
 */
export async function findPlace(
  query: string,
  destination?: string
): Promise<{ placeId: string; location: { lat: number; lng: number } } | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const searchQuery = destination ? `${query}, ${destination}` : query;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Use Find Place API to get the Place ID
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodedQuery}&inputtype=textquery&fields=place_id,geometry,name&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Find Place API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.status === "OK" && data.candidates?.length > 0) {
      const candidate = data.candidates[0];
      return {
        placeId: candidate.place_id,
        location: {
          lat: candidate.geometry.location.lat,
          lng: candidate.geometry.location.lng,
        },
      };
    }

    return null;
  } catch (error) {
    console.error("Find Place error:", error);
    return null;
  }
}

/**
 * Get detailed place information including photos, reviews, and more
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  // Check cache first
  const cached = placeDetailsCache.get(placeId);
  if (cached) {
    return cached;
  }

  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    // Request all relevant fields
    const fields = [
      "place_id",
      "name",
      "formatted_address",
      "geometry",
      "rating",
      "user_ratings_total",
      "price_level",
      "photos",
      "opening_hours",
      "website",
      "formatted_phone_number",
      "url", // Google Maps URL
      "types",
      "editorial_summary",
      "reviews",
      "business_status",
    ].join(",");

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Place Details API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.status === "OK" && data.result) {
      const result = data.result;
      
      // Generate photo URLs
      const photos: PlacePhoto[] = (result.photos || []).slice(0, 5).map((photo: { photo_reference: string; height: number; width: number; html_attributions?: string[] }) => ({
        photoReference: photo.photo_reference,
        height: photo.height,
        width: photo.width,
        url: getPhotoUrl(photo.photo_reference, 800, apiKey),
        attributions: photo.html_attributions,
      }));

      // Extract reviews
      const reviews: PlaceReview[] = (result.reviews || []).slice(0, 3).map((review: { author_name: string; rating: number; text: string; relative_time_description: string; profile_photo_url?: string }) => ({
        authorName: review.author_name,
        rating: review.rating,
        text: review.text,
        relativeTimeDescription: review.relative_time_description,
        profilePhotoUrl: review.profile_photo_url,
      }));

      const placeDetails: PlaceDetails = {
        placeId: result.place_id,
        name: result.name,
        formattedAddress: result.formatted_address,
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
        rating: result.rating,
        userRatingsTotal: result.user_ratings_total,
        priceLevel: result.price_level,
        photos,
        openingHours: result.opening_hours ? {
          openNow: result.opening_hours.open_now,
          weekdayText: result.opening_hours.weekday_text,
        } : undefined,
        website: result.website,
        phoneNumber: result.formatted_phone_number,
        googleMapsUrl: result.url,
        types: result.types,
        editorial_summary: result.editorial_summary?.overview,
        reviews,
        businessStatus: result.business_status,
      };

      // Cache the result
      placeDetailsCache.set(placeId, placeDetails);
      
      return placeDetails;
    }

    return null;
  } catch (error) {
    console.error("Place Details error:", error);
    return null;
  }
}

/**
 * Generate a photo URL from a photo reference
 */
export function getPhotoUrl(photoReference: string, maxWidth: number = 800, apiKey?: string): string {
  const key = apiKey || getApiKey();
  if (!key) return "";
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${key}`;
}

/**
 * Get booking URL based on activity type
 */
export function getBookingUrl(
  placeDetails: PlaceDetails,
  activityType: string
): { url: string; label: string } {
  const { name, formattedAddress, googleMapsUrl } = placeDetails;
  const encodedName = encodeURIComponent(name);
  const encodedAddress = encodeURIComponent(formattedAddress || name);

  switch (activityType) {
    case "hotel":
      // Link to booking.com search
      return {
        url: `https://www.booking.com/searchresults.html?ss=${encodedName}`,
        label: "Book on Booking.com",
      };
    case "restaurant":
      // Link to OpenTable or Google Maps for reservations
      return {
        url: placeDetails.website || googleMapsUrl || `https://www.google.com/maps/search/${encodedAddress}`,
        label: "Make Reservation",
      };
    case "attraction":
      // Link to Viator or GetYourGuide for tours
      return {
        url: `https://www.viator.com/searchResults/all?text=${encodedName}`,
        label: "Book Tour",
      };
    case "flight":
      return {
        url: "https://www.google.com/travel/flights",
        label: "Search Flights",
      };
    case "transport":
      return {
        url: googleMapsUrl || `https://www.google.com/maps/dir//${encodedAddress}`,
        label: "Get Directions",
      };
    default:
      return {
        url: googleMapsUrl || `https://www.google.com/maps/search/${encodedAddress}`,
        label: "View on Maps",
      };
  }
}

/**
 * Convert price level (0-4) to human-readable format
 */
export function formatPriceLevel(priceLevel?: number): string {
  if (priceLevel === undefined || priceLevel === null) return "";
  const symbols = ["Free", "$", "$$", "$$$", "$$$$"];
  return symbols[priceLevel] || "";
}

/**
 * Enrich a single activity with Google Places data
 */
export async function enrichActivity(
  activity: {
    title: string;
    type: string;
    location?: string;
    description?: string;
    time?: string;
    price?: string;
    action_label?: string;
  },
  destination: string
): Promise<EnrichedActivity> {
  // Base activity with defaults
  const enrichedActivity: EnrichedActivity = {
    title: activity.title,
    type: activity.type as EnrichedActivity["type"],
    location: activity.location,
    description: activity.description,
    time: activity.time,
    price: activity.price,
    latitude: 0,
    longitude: 0,
  };

  // Skip enrichment for certain types
  if (activity.type === "flight" || activity.type === "transport") {
    return enrichedActivity;
  }

  try {
    // Find the place
    const searchQuery = activity.title || activity.location || "";
    const placeResult = await findPlace(searchQuery, destination);
    
    if (!placeResult) {
      console.log(`Could not find place for: ${searchQuery}`);
      return enrichedActivity;
    }

    // Get detailed place info
    const placeDetails = await getPlaceDetails(placeResult.placeId);
    
    if (!placeDetails) {
      // At least use the coordinates we found
      enrichedActivity.latitude = placeResult.location.lat;
      enrichedActivity.longitude = placeResult.location.lng;
      enrichedActivity.placeId = placeResult.placeId;
      return enrichedActivity;
    }

    // Get booking info
    const bookingInfo = getBookingUrl(placeDetails, activity.type);

    // Build enriched activity
    enrichedActivity.placeId = placeDetails.placeId;
    enrichedActivity.latitude = placeDetails.location.lat;
    enrichedActivity.longitude = placeDetails.location.lng;
    enrichedActivity.rating = placeDetails.rating;
    enrichedActivity.userRatingsTotal = placeDetails.userRatingsTotal;
    enrichedActivity.priceLevel = placeDetails.priceLevel;
    enrichedActivity.website = placeDetails.website;
    enrichedActivity.phoneNumber = placeDetails.phoneNumber;
    enrichedActivity.googleMapsUrl = placeDetails.googleMapsUrl;
    enrichedActivity.openNow = placeDetails.openingHours?.openNow;
    enrichedActivity.openingHours = placeDetails.openingHours?.weekdayText;
    
    // Use editorial summary if available, otherwise keep AI description
    if (placeDetails.editorial_summary) {
      enrichedActivity.editorialSummary = placeDetails.editorial_summary;
    }

    // Get photo URLs
    if (placeDetails.photos && placeDetails.photos.length > 0) {
      enrichedActivity.photos = placeDetails.photos
        .filter(p => p.url)
        .map(p => p.url as string);
      
      // Set primary image
      enrichedActivity.image = enrichedActivity.photos[0];
    }

    // Get top review
    if (placeDetails.reviews && placeDetails.reviews.length > 0) {
      const topReview = placeDetails.reviews[0];
      enrichedActivity.topReview = {
        authorName: topReview.authorName,
        rating: topReview.rating,
        text: topReview.text.length > 200 
          ? `${topReview.text.substring(0, 200)}...`
          : topReview.text,
      };
    }

    // Set booking URL and label
    enrichedActivity.booking_url = bookingInfo.url;
    enrichedActivity.action_label = activity.action_label || bookingInfo.label;

    // Update location with formatted address if we have it
    if (placeDetails.formattedAddress) {
      enrichedActivity.location = placeDetails.formattedAddress;
    }

    // Update price note with price level if we don't have a specific price
    if (!activity.price && placeDetails.priceLevel !== undefined) {
      enrichedActivity.price_note = formatPriceLevel(placeDetails.priceLevel);
    }

    return enrichedActivity;
  } catch (error) {
    console.error(`Error enriching activity ${activity.title}:`, error);
    return enrichedActivity;
  }
}

/**
 * Batch enrich multiple activities with concurrency control
 */
export async function enrichActivities(
  activities: Array<{
    title: string;
    type: string;
    location?: string;
    description?: string;
    time?: string;
    price?: string;
    action_label?: string;
  }>,
  destination: string
): Promise<EnrichedActivity[]> {
  const CONCURRENCY = 3; // Limit concurrent API calls
  const results: EnrichedActivity[] = [];

  // Process in chunks
  for (let i = 0; i < activities.length; i += CONCURRENCY) {
    const chunk = activities.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(activity => enrichActivity(activity, destination))
    );
    results.push(...chunkResults);

    // Small delay between chunks to respect rate limits
    if (i + CONCURRENCY < activities.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Enrich an entire day's worth of activities
 */
export async function enrichDay(
  day: {
    day_number: number;
    date?: string;
    title: string;
    description?: string;
    activities?: Array<{
      title: string;
      type: string;
      location?: string;
      description?: string;
      time?: string;
      price?: string;
      action_label?: string;
    }>;
  },
  destination: string
): Promise<{
  day_number: number;
  date?: string;
  title: string;
  description?: string;
  activities: EnrichedActivity[];
}> {
  const enrichedActivities = day.activities 
    ? await enrichActivities(day.activities, destination)
    : [];

  return {
    day_number: day.day_number,
    date: day.date,
    title: day.title,
    description: day.description,
    activities: enrichedActivities,
  };
}

/**
 * Enrich all days in an itinerary
 */
export async function enrichItinerary(
  days: Array<{
    day_number: number;
    date?: string;
    title: string;
    description?: string;
    activities?: Array<{
      title: string;
      type: string;
      location?: string;
      description?: string;
      time?: string;
      price?: string;
      action_label?: string;
    }>;
  }>,
  destination: string
): Promise<Array<{
  day_number: number;
  date?: string;
  title: string;
  description?: string;
  activities: EnrichedActivity[];
}>> {
  // Process days sequentially to avoid overwhelming the API
  const enrichedDays = [];
  
  for (const day of days) {
    console.log(`Enriching Day ${day.day_number}: ${day.title}`);
    const enrichedDay = await enrichDay(day, destination);
    enrichedDays.push(enrichedDay);
  }

  return enrichedDays;
}
