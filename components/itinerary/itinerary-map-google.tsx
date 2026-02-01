"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline,
  InfoWindow,
  DirectionsRenderer,
  type Libraries,
} from "@react-google-maps/api";

// Keep libraries array as a constant outside the component to prevent reloading
const GOOGLE_MAPS_LIBRARIES: Libraries = ["places"];

interface Activity {
  id: string;
  time: string;
  title: string;
  type: "flight" | "hotel" | "restaurant" | "attraction" | "transport";
  location: string;
  price?: string;
  priceNote?: string;
  image: string;
  actionLabel: string;
  coordinates: [number, number];
}

interface UniqueLocation {
  id: string;
  title: string; // Primary display name (e.g., "The Houghton Hotel")
  location: string; // Address/location field from database
  coordinates: [number, number];
  type: Activity["type"];
  activities: Activity[];
  markerNumber: number;
}

interface ItineraryMapProps {
  activities: Activity[];
  hoveredActivity: Activity | null;
  selectedActivity: Activity | null;
  onActivitySelect: (activity: Activity | null) => void;
  selectedDay: number;
  totalDays: number;
  onDayChange: (day: number) => void;
  documentId?: string;
  onReGeocodeComplete?: () => void;
}

// Dark mode map styles
const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d1d1d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d1d1d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8c8c8c" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1d1d1d" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1d1d1d" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3f3f3" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f2f2f" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4e6d70" }] },
];

const containerStyle = {
  width: "100%",
  height: "100%",
};

// Helper to check if two coordinates are the same
function isSameLocation(a: [number, number], b: [number, number], tolerance = 0.0001): boolean {
  return Math.abs(a[0] - b[0]) < tolerance && Math.abs(a[1] - b[1]) < tolerance;
}

export function ItineraryMap({
  activities,
  hoveredActivity,
  selectedActivity,
  onActivitySelect,
  selectedDay,
  totalDays,
  onDayChange,
  documentId,
  onReGeocodeComplete,
}: ItineraryMapProps) {
  const [mapStyle, setMapStyle] = useState<"dark" | "satellite">("dark");
  const [isRouteCardCollapsed, setIsRouteCardCollapsed] = useState(false);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isReGeocoding, setIsReGeocoding] = useState(false);
  const [infoWindowLocation, setInfoWindowLocation] = useState<UniqueLocation | null>(null);
  const [placeDetails, setPlaceDetails] = useState<google.maps.places.PlaceResult | null>(null);
  const [isLoadingPlace, setIsLoadingPlace] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Filter activities with valid coordinates
  const validActivities = useMemo(
    () => activities.filter((a) => a.coordinates && a.coordinates[0] !== 0 && a.coordinates[1] !== 0),
    [activities]
  );

  // Get unique locations (deduplicated by coordinates)
  const uniqueLocations = useMemo(() => {
    const locations: UniqueLocation[] = [];
    let markerNum = 1;
    
    for (const activity of validActivities) {
      const existing = locations.find(loc => isSameLocation(loc.coordinates, activity.coordinates));
      if (existing) {
        existing.activities.push(activity);
      } else {
        locations.push({
          id: `loc-${markerNum}`,
          title: activity.title, // Use title as primary display name
          location: activity.location,
          coordinates: activity.coordinates,
          type: activity.type,
          activities: [activity],
          markerNumber: markerNum,
        });
        markerNum++;
      }
    }
    return locations;
  }, [validActivities]);

  // Get the route sequence (all activities in order)
  const routeSequence = useMemo(() => {
    return validActivities.map(a => ({ lat: a.coordinates[0], lng: a.coordinates[1] }));
  }, [validActivities]);

  // Get previous and next activity for selected activity
  const getActivityNavigation = useCallback((activity: Activity | null) => {
    if (!activity) return { prev: null, next: null, currentIndex: 0, total: 0 };
    const index = validActivities.findIndex(a => a.id === activity.id);
    return {
      prev: index > 0 ? validActivities[index - 1] : null,
      next: index < validActivities.length - 1 ? validActivities[index + 1] : null,
      currentIndex: index,
      total: validActivities.length,
    };
  }, [validActivities]);

  // Calculate center
  const center = useMemo(() => {
    if (uniqueLocations.length === 0) return { lat: 41.9028, lng: 12.4964 };
    const avgLat = uniqueLocations.reduce((sum, l) => sum + l.coordinates[0], 0) / uniqueLocations.length;
    const avgLng = uniqueLocations.reduce((sum, l) => sum + l.coordinates[1], 0) / uniqueLocations.length;
    return { lat: avgLat, lng: avgLng };
  }, [uniqueLocations]);

  // Store map reference and create Places service
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    placesServiceRef.current = new google.maps.places.PlacesService(map);
  }, []);

  // Fetch place details from Google Places API
  const fetchPlaceDetails = useCallback((location: UniqueLocation) => {
    if (!placesServiceRef.current || !mapRef.current) return;
    
    setIsLoadingPlace(true);
    setPlaceDetails(null);
    
    // Build a search query that includes location context from the activity
    // This helps find the correct place even if coordinates are wrong
    const activityLocation = location.activities[0]?.location || "";
    const cityHint = activityLocation.split(",").pop()?.trim() || ""; // Get last part (often city/country)
    
    // Search by title + city hint for better accuracy
    // Don't use coordinates as location bias since they might be wrong
    const searchQuery = cityHint && !location.title.toLowerCase().includes(cityHint.toLowerCase())
      ? `${location.title} ${cityHint}`
      : location.title;
    
    const request: google.maps.places.TextSearchRequest = {
      query: searchQuery,
      // Don't use location bias - let Google find the actual place by name
    };

    placesServiceRef.current.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
        // Get detailed info using place_id
        const placeId = results[0].place_id;
        if (placeId) {
          placesServiceRef.current?.getDetails(
            {
              placeId,
              fields: ["name", "formatted_address", "photos", "opening_hours", "website", "formatted_phone_number", "rating", "user_ratings_total", "url", "geometry"],
            },
            (place, detailStatus) => {
              setIsLoadingPlace(false);
              if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
                setPlaceDetails(place);
                // Pan to the correct location if Google found a different place
                if (place.geometry?.location && mapRef.current) {
                  mapRef.current.panTo(place.geometry.location);
                }
              } else {
                // Use basic result if details fail
                setPlaceDetails(results[0]);
                if (results[0].geometry?.location && mapRef.current) {
                  mapRef.current.panTo(results[0].geometry.location);
                }
              }
            }
          );
        } else {
          setIsLoadingPlace(false);
          setPlaceDetails(results[0]);
          if (results[0].geometry?.location && mapRef.current) {
            mapRef.current.panTo(results[0].geometry.location);
          }
        }
      } else {
        setIsLoadingPlace(false);
        // No results found, will show fallback in UI
      }
    });
  }, []);

  // Re-geocode all activities using Places API
  const handleReGeocode = useCallback(async () => {
    if (!documentId || isReGeocoding) return;
    
    setIsReGeocoding(true);
    try {
      const response = await fetch("/api/itinerary/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, force: true }),
      });
      
      const result = await response.json();
      
      if (result.geocoded > 0) {
        // Notify parent to refresh
        onReGeocodeComplete?.();
      }
    } catch (error) {
      console.error("Re-geocode failed:", error);
    } finally {
      setIsReGeocoding(false);
    }
  }, [documentId, isReGeocoding, onReGeocodeComplete]);

  // Fit bounds when activities change
  useEffect(() => {
    if (mapRef.current && uniqueLocations.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      uniqueLocations.forEach((loc) => {
        bounds.extend({ lat: loc.coordinates[0], lng: loc.coordinates[1] });
      });
      mapRef.current.fitBounds(bounds, { top: 100, right: 100, bottom: 100, left: 100 });
    }
  }, [uniqueLocations]);

  // Fetch directions for route
  useEffect(() => {
    if (!isLoaded || routeSequence.length < 2) {
      setDirections(null);
      setIsLoadingRoute(false);
      return;
    }

    setIsLoadingRoute(true);
    const directionsService = new google.maps.DirectionsService();
    
    const origin = routeSequence[0];
    const destination = routeSequence[routeSequence.length - 1];
    const waypoints = routeSequence.slice(1, -1).map((point) => ({
      location: point,
      stopover: true,
    }));

    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      },
      (result, status) => {
        setIsLoadingRoute(false);
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        } else {
          setDirections(null);
        }
      }
    );
  }, [isLoaded, routeSequence]);

  // Pan to hovered/selected activity
  useEffect(() => {
    const targetActivity = hoveredActivity || selectedActivity;
    if (mapRef.current && targetActivity) {
      const location = uniqueLocations.find(loc => 
        loc.activities.some(a => a.id === targetActivity.id)
      );
      if (location) {
        mapRef.current.panTo({ lat: location.coordinates[0], lng: location.coordinates[1] });
        mapRef.current.setZoom(16);
      }
    }
  }, [hoveredActivity, selectedActivity, uniqueLocations]);

  // Get marker icon based on type
  const getMarkerIcon = (type: Activity["type"], isActive: boolean) => {
    const colors: Record<Activity["type"], { bg: string; border: string }> = {
      flight: { bg: "#3b82f6", border: "#60a5fa" },
      hotel: { bg: "#8b5cf6", border: "#a78bfa" },
      restaurant: { bg: "#f59e0b", border: "#fbbf24" },
      attraction: { bg: "#10b981", border: "#34d399" },
      transport: { bg: "#6366f1", border: "#818cf8" },
    };
    const color = colors[type] || colors.attraction;
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: isActive ? color.border : color.bg,
      fillOpacity: 1,
      strokeColor: isActive ? "#fff" : color.border,
      strokeWeight: isActive ? 3 : 2,
      scale: isActive ? 16 : 12,
    };
  };

  // Get type icon emoji
  const getTypeIcon = (type: Activity["type"]) => {
    switch (type) {
      case "flight": return "✈️";
      case "hotel": return "🏨";
      case "restaurant": return "🍽️";
      case "attraction": return "🏛️";
      case "transport": return "🚕";
      default: return "📍";
    }
  };

  // Get type label
  const getTypeLabel = (type: Activity["type"]) => {
    switch (type) {
      case "flight": return "Airport";
      case "hotel": return "Hotel";
      case "restaurant": return "Restaurant";
      case "attraction": return "Attraction";
      case "transport": return "Transport";
      default: return "Location";
    }
  };

  if (loadError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
        <div className="text-red-400">Failed to load Google Maps</div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400">Loading map...</span>
        </div>
      </div>
    );
  }

  if (uniqueLocations.length === 0) {
    return (
      <div className="relative w-full h-full">
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-center p-8">
          <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Map Coming Soon</h3>
          <p className="text-zinc-500 text-sm max-w-xs">
            Location coordinates are being processed. The interactive map will display your route once locations are geocoded.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {activities.slice(0, 5).map((activity) => (
              <span key={activity.id} className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400">
                {getTypeIcon(activity.type)} {activity.location?.split(",")[0] || activity.title}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const navigation = getActivityNavigation(selectedActivity);

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        onLoad={onMapLoad}
        options={{
          styles: mapStyle === "dark" ? darkMapStyles : undefined,
          mapTypeId: mapStyle === "satellite" ? "satellite" : "roadmap",
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {/* Route line using Directions API */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: "#3b82f6",
                strokeWeight: 4,
                strokeOpacity: 0.9,
              },
            }}
          />
        )}

        {/* Fallback polyline */}
        {!directions && routeSequence.length > 1 && (
          <Polyline
            path={routeSequence}
            options={{
              strokeColor: "#3b82f6",
              strokeWeight: 3,
              strokeOpacity: 0.7,
              geodesic: true,
            }}
          />
        )}

        {/* Unique Location Markers */}
        {uniqueLocations.map((location) => {
          const isActive = selectedActivity 
            ? location.activities.some(a => a.id === selectedActivity.id)
            : hoveredActivity 
              ? location.activities.some(a => a.id === hoveredActivity.id)
              : false;
          const isInfoOpen = infoWindowLocation?.id === location.id;

          return (
            <Marker
              key={location.id}
              position={{ lat: location.coordinates[0], lng: location.coordinates[1] }}
              onClick={() => {
                if (isInfoOpen) {
                  // Close info window if clicking same marker
                  setInfoWindowLocation(null);
                  setPlaceDetails(null);
                } else {
                  // Open info window and fetch place details
                  setInfoWindowLocation(location);
                  fetchPlaceDetails(location);
                }
              }}
              icon={getMarkerIcon(location.type, isActive || isInfoOpen)}
              label={{
                text: String(location.markerNumber),
                color: "white",
                fontSize: isActive || isInfoOpen ? "13px" : "11px",
                fontWeight: "bold",
              }}
              zIndex={isActive || isInfoOpen ? 1000 : location.markerNumber}
            />
          );
        })}

        {/* Google Places Info Window */}
        {infoWindowLocation && (
          <InfoWindow
            position={
              // Use Google Places geometry if available (more accurate), otherwise fall back to stored coordinates
              placeDetails?.geometry?.location
                ? { 
                    lat: placeDetails.geometry.location.lat(), 
                    lng: placeDetails.geometry.location.lng() 
                  }
                : { lat: infoWindowLocation.coordinates[0], lng: infoWindowLocation.coordinates[1] }
            }
            onCloseClick={() => {
              setInfoWindowLocation(null);
              setPlaceDetails(null);
            }}
            options={{
              maxWidth: 320,
              pixelOffset: new google.maps.Size(0, -5),
            }}
          >
            <div style={{ minWidth: "280px", fontFamily: "Roboto, Arial, sans-serif" }}>
              {/* Place Photo */}
              {placeDetails?.photos?.[0] && (
                <div style={{ width: "100%", height: "150px", marginBottom: "12px", borderRadius: "8px", overflow: "hidden", position: "relative" }}>
                  <Image
                    src={placeDetails.photos[0].getUrl({ maxWidth: 320, maxHeight: 150 })}
                    alt={placeDetails.name || infoWindowLocation.title}
                    fill
                    style={{ objectFit: "cover" }}
                    unoptimized
                  />
                </div>
              )}
              
              {/* Place Name */}
              <div style={{ fontSize: "16px", fontWeight: "500", color: "#1a1a1a", marginBottom: "8px" }}>
                {placeDetails?.name || infoWindowLocation.title}
              </div>
              
              {/* Rating */}
              {placeDetails?.rating && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                  <span style={{ color: "#fbbc04", fontSize: "14px" }}>★</span>
                  <span style={{ fontSize: "14px", color: "#1a1a1a" }}>{placeDetails.rating}</span>
                  {placeDetails.user_ratings_total && (
                    <span style={{ fontSize: "13px", color: "#70757a" }}>({placeDetails.user_ratings_total.toLocaleString()} reviews)</span>
                  )}
                </div>
              )}
              
              {/* Address */}
              {(placeDetails?.formatted_address || infoWindowLocation.location) && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                  <svg style={{ width: "18px", height: "18px", flexShrink: 0, marginTop: "2px" }} viewBox="0 0 24 24" fill="#70757a">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span style={{ fontSize: "13px", color: "#3c4043", lineHeight: "1.4" }}>
                    {placeDetails?.formatted_address || infoWindowLocation.location}
                  </span>
                </div>
              )}
              
              {/* Opening Hours */}
              {placeDetails?.opening_hours && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <svg style={{ width: "18px", height: "18px", flexShrink: 0 }} viewBox="0 0 24 24" fill="#70757a">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                  </svg>
                  <span style={{ fontSize: "13px", color: placeDetails.opening_hours.isOpen?.() ? "#188038" : "#d93025" }}>
                    {placeDetails.opening_hours.isOpen?.() ? "Open now" : "Closed"}
                  </span>
                </div>
              )}
              
              {/* Website */}
              {placeDetails?.website && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <svg style={{ width: "18px", height: "18px", flexShrink: 0 }} viewBox="0 0 24 24" fill="#70757a">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>
                  </svg>
                  <a href={placeDetails.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13px", color: "#1a73e8", textDecoration: "none" }}>
                    {new URL(placeDetails.website).hostname}
                  </a>
                </div>
              )}
              
              {/* Phone */}
              {placeDetails?.formatted_phone_number && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <svg style={{ width: "18px", height: "18px", flexShrink: 0 }} viewBox="0 0 24 24" fill="#70757a">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  <a href={`tel:${placeDetails.formatted_phone_number}`} style={{ fontSize: "13px", color: "#1a73e8", textDecoration: "none" }}>
                    {placeDetails.formatted_phone_number}
                  </a>
                </div>
              )}
              
              {/* View on Google Maps link */}
              {placeDetails?.url && (
                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #e8eaed" }}>
                  <a 
                    href={placeDetails.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ fontSize: "13px", color: "#1a73e8", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    View on Google Maps
                    <svg style={{ width: "14px", height: "14px" }} viewBox="0 0 24 24" fill="#1a73e8">
                      <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                    </svg>
                  </a>
                </div>
              )}
              
              {/* Loading state */}
              {isLoadingPlace && !placeDetails && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                  <div style={{ width: "24px", height: "24px", border: "3px solid #e8eaed", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
              
              {/* Fallback if no place details found */}
              {!isLoadingPlace && !placeDetails && (
                <div style={{ fontSize: "13px", color: "#3c4043" }}>
                  {infoWindowLocation.title}
                  {infoWindowLocation.location && infoWindowLocation.location !== infoWindowLocation.title && (
                    <div style={{ marginTop: "4px", fontSize: "12px", color: "#70757a" }}>
                      {infoWindowLocation.location}
                    </div>
                  )}
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Route Loading Indicator */}
      {isLoadingRoute && (
        <div className="absolute top-4 left-4 z-[1000] px-3 py-2 rounded-lg bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-300">Loading route...</span>
        </div>
      )}

      {/* Day Navigation */}
      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onDayChange(Math.max(1, selectedDay - 1))}
          disabled={selectedDay === 1}
          className="w-8 h-8 rounded-lg bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
        <div className="px-3 py-2 rounded-lg bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 text-sm text-white">
          Day {selectedDay} of {totalDays}
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onDayChange(Math.min(totalDays, selectedDay + 1))}
          disabled={selectedDay === totalDays}
          className="w-8 h-8 rounded-lg bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>

      {/* Map Controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2">
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setMapStyle(mapStyle === "dark" ? "satellite" : "dark")}
          className={`w-9 h-9 rounded-lg backdrop-blur-sm border flex items-center justify-center transition-all ${
            mapStyle === "satellite"
              ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
              : "bg-zinc-900/90 border-zinc-700 text-zinc-400 hover:text-white"
          }`}
          title={mapStyle === "dark" ? "Satellite" : "Dark"}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() || 13) + 1)}
          className="w-9 h-9 rounded-lg bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() || 13) - 1)}
          className="w-9 h-9 rounded-lg bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (mapRef.current && uniqueLocations.length > 0) {
              const bounds = new google.maps.LatLngBounds();
              uniqueLocations.forEach((loc) => {
                bounds.extend({ lat: loc.coordinates[0], lng: loc.coordinates[1] });
              });
              mapRef.current.fitBounds(bounds, { top: 100, right: 100, bottom: 100, left: 100 });
            }
          }}
          className="w-9 h-9 rounded-lg bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </motion.button>
        {/* Fix Locations Button */}
        {documentId && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleReGeocode}
            disabled={isReGeocoding}
            className={`w-9 h-9 rounded-lg backdrop-blur-sm border flex items-center justify-center transition-all ${
              isReGeocoding
                ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                : "bg-zinc-900/90 border-zinc-700 text-zinc-400 hover:text-white"
            }`}
            title="Fix marker locations"
          >
            {isReGeocoding ? (
              <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </motion.button>
        )}
      </div>

      {/* Location Legend */}
      <div className="absolute bottom-6 left-6 z-[1000] p-3 rounded-xl bg-zinc-900/95 backdrop-blur-sm border border-zinc-700">
        <div className="text-xs text-zinc-500 mb-2 font-medium">Locations</div>
        <div className="flex flex-col gap-1.5">
          {uniqueLocations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => {
                onActivitySelect(loc.activities[0]);
                mapRef.current?.panTo({ lat: loc.coordinates[0], lng: loc.coordinates[1] });
                mapRef.current?.setZoom(16);
              }}
              className={`flex items-center gap-2 px-2 py-1 rounded-lg text-left transition-all ${
                selectedActivity && loc.activities.some(a => a.id === selectedActivity.id)
                  ? "bg-blue-500/20 border border-blue-500/30"
                  : "hover:bg-zinc-800"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-white font-semibold">
                {loc.markerNumber}
              </span>
              <span className="text-sm">{getTypeIcon(loc.type)}</span>
              <span className="text-xs text-zinc-300 truncate max-w-[120px]">
                {loc.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity Card with From/To */}
      <AnimatePresence mode="wait">
        {selectedActivity && (
          <motion.div
            key="activity-card"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-6 right-6 z-[1000] w-80 rounded-2xl bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 overflow-hidden"
          >
            <div className="relative h-28 overflow-hidden">
              <Image
                src={selectedActivity.image}
                alt={selectedActivity.title}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onActivitySelect(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-blue-500 text-xs text-white font-semibold">
                Step {navigation.currentIndex + 1} of {navigation.total}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{selectedActivity.time}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-xs text-zinc-400">
                  {getTypeIcon(selectedActivity.type)} {getTypeLabel(selectedActivity.type)}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{selectedActivity.title}</h3>
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span className="truncate">{selectedActivity.location}</span>
              </div>

              {/* From / To Navigation */}
              <div className="bg-zinc-800/50 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">From</div>
                    {navigation.prev ? (
                      <button
                        type="button"
                        onClick={() => onActivitySelect(navigation.prev)}
                        className="text-xs text-zinc-300 hover:text-blue-400 transition-colors flex items-center gap-1"
                      >
                        <span>{getTypeIcon(navigation.prev.type)}</span>
                        <span className="truncate">{navigation.prev.title}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-600">Start</span>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <div className="flex-1 text-right">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Next</div>
                    {navigation.next ? (
                      <button
                        type="button"
                        onClick={() => onActivitySelect(navigation.next)}
                        className="text-xs text-zinc-300 hover:text-blue-400 transition-colors flex items-center gap-1 justify-end"
                      >
                        <span className="truncate">{navigation.next.title}</span>
                        <span>{getTypeIcon(navigation.next.type)}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-600">End</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedActivity.price && (
                <div className="flex items-center gap-2 text-sm mb-3">
                  <span className="text-blue-400 font-semibold">{selectedActivity.price}</span>
                  {selectedActivity.priceNote && <span className="text-zinc-500">{selectedActivity.priceNote}</span>}
                </div>
              )}

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors text-sm"
              >
                {selectedActivity.actionLabel}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Route Summary Card */}
      {!selectedActivity && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`absolute bottom-6 right-6 z-[1000] rounded-2xl bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 overflow-hidden transition-all duration-300 ${
            isRouteCardCollapsed ? "w-14" : "w-72"
          }`}
        >
          {isRouteCardCollapsed ? (
            <motion.button
              type="button"
              onClick={() => setIsRouteCardCollapsed(false)}
              className="w-full h-14 flex items-center justify-center text-zinc-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </motion.button>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <span className="font-semibold text-white">Day {selectedDay} Route</span>
                </div>
                <motion.button
                  type="button"
                  onClick={() => setIsRouteCardCollapsed(true)}
                  className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.button>
              </div>

              <div className="space-y-2">
                {uniqueLocations.map((loc, index) => (
                  <div key={loc.id} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-white font-semibold">
                      {loc.markerNumber}
                    </span>
                    <span className="text-sm">{getTypeIcon(loc.type)}</span>
                    <span className="text-xs text-zinc-400 truncate flex-1">{loc.location.split(",")[0]}</span>
                    {index < uniqueLocations.length - 1 && (
                      <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-500">{uniqueLocations.length} locations</span>
                <span className="text-xs text-zinc-500">{validActivities.length} activities</span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
