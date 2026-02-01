/**
 * Geocoding utility using Google Maps Places API for accurate place locations
 */

interface GeocodingResult {
  lat: number;
  lng: number;
  placeId?: string;
}

interface GooglePlacesResponse {
  candidates: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
    name: string;
    place_id: string;
  }>;
  status: string;
}

interface GoogleGeocodingResponse {
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
    place_id?: string;
  }>;
  status: string;
}

// Cache for geocoding results to avoid duplicate API calls
const geocodingCache = new Map<string, GeocodingResult>();

/**
 * Geocode a location string to coordinates using Google Places API (Find Place)
 * Falls back to Geocoding API if Places API doesn't find results
 */
export async function geocodeLocation(
  location: string,
  destination?: string
): Promise<GeocodingResult | null> {
  if (!location) return null;

  // Create cache key
  const cacheKey = `${location}|${destination || ""}`.toLowerCase();
  
  // Check cache first
  const cached = geocodingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn("GOOGLE_MAPS_API_KEY not set, skipping geocoding");
    return null;
  }

  try {
    // Build the query - include destination for better accuracy
    const query = destination 
      ? `${location}, ${destination}` 
      : location;
    
    // First try Places API (Find Place from Text) - better for establishments
    const placesResult = await findPlaceFromText(query, apiKey);
    if (placesResult) {
      geocodingCache.set(cacheKey, placesResult);
      return placesResult;
    }

    // Fallback to standard Geocoding API for addresses
    const geocodeResult = await geocodeAddress(query, apiKey);
    if (geocodeResult) {
      geocodingCache.set(cacheKey, geocodeResult);
      return geocodeResult;
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Find place using Google Places API - better for establishments like restaurants, hotels, attractions
 */
async function findPlaceFromText(
  query: string,
  apiKey: string
): Promise<GeocodingResult | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodedQuery}&inputtype=textquery&fields=geometry,formatted_address,name,place_id&key=${apiKey}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Places API error: ${response.status}`);
      return null;
    }

    const data: GooglePlacesResponse = await response.json();

    if (data.status === "OK" && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      return {
        lat: candidate.geometry.location.lat,
        lng: candidate.geometry.location.lng,
        placeId: candidate.place_id,
      };
    }

    return null;
  } catch (error) {
    console.error("Places API error:", error);
    return null;
  }
}

/**
 * Geocode using standard Geocoding API - better for street addresses
 */
async function geocodeAddress(
  query: string,
  apiKey: string
): Promise<GeocodingResult | null> {
  try {
    const encodedAddress = encodeURIComponent(query);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Geocoding API error: ${response.status}`);
      return null;
    }

    const data: GoogleGeocodingResponse = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        placeId: result.place_id,
      };
    }

    if (data.status === "ZERO_RESULTS") {
      console.warn(`No geocoding results for: ${query}`);
    } else if (data.status !== "OK") {
      console.error(`Geocoding API status: ${data.status}`);
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Batch geocode multiple locations
 */
export async function batchGeocodeLocations(
  locations: Array<{ id: string; location: string }>,
  destination?: string
): Promise<Map<string, GeocodingResult>> {
  const results = new Map<string, GeocodingResult>();
  
  // Process in parallel with concurrency limit
  const CONCURRENCY = 5;
  const chunks: Array<Array<{ id: string; location: string }>> = [];
  
  for (let i = 0; i < locations.length; i += CONCURRENCY) {
    chunks.push(locations.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async ({ id, location }) => {
      const coords = await geocodeLocation(location, destination);
      if (coords) {
        results.set(id, coords);
      }
    });
    
    await Promise.all(promises);
    
    // Small delay between chunks to respect rate limits
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Get coordinates for a destination city
 */
export async function geocodeDestination(
  destination: string
): Promise<GeocodingResult | null> {
  return geocodeLocation(destination);
}
