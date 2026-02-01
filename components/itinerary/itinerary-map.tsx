"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import "leaflet/dist/leaflet.css";

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

interface ItineraryMapProps {
  activities: Activity[];
  hoveredActivity: Activity | null;
  selectedActivity: Activity | null;
  onActivitySelect: (activity: Activity | null) => void;
  selectedDay: number;
  totalDays: number;
  onDayChange: (day: number) => void;
}

// Fetch route from OSRM (Open Source Routing Machine)
async function fetchRouteFromOSRM(
  coordinates: [number, number][]
): Promise<[number, number][]> {
  if (coordinates.length < 2) return coordinates;

  // OSRM expects coordinates as lng,lat pairs
  const coordString = coordinates
    .map(([lat, lng]) => `${lng},${lat}`)
    .join(";");

  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`
    );
    
    if (!response.ok) {
      console.warn("OSRM request failed, falling back to straight lines");
      return coordinates;
    }

    const data = await response.json();
    
    if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates) {
      console.warn("OSRM returned no route, falling back to straight lines");
      return coordinates;
    }

    // Convert GeoJSON coordinates (lng, lat) back to Leaflet format (lat, lng)
    const routeCoords: [number, number][] = data.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    );

    return routeCoords;
  } catch (error) {
    console.warn("Failed to fetch route from OSRM:", error);
    return coordinates;
  }
}

// Custom numbered marker icon
function createNumberedIcon(number: number, isHovered: boolean = false) {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${isHovered ? "36px" : "28px"};
        height: ${isHovered ? "36px" : "28px"};
        background: ${isHovered ? "#3b82f6" : "#1a1a1d"};
        border: 2px solid ${isHovered ? "#60a5fa" : "#3b82f6"};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: ${isHovered ? "14px" : "12px"};
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(59, 130, 246, ${isHovered ? "0.5" : "0.3"});
        transition: all 0.2s ease;
      ">
        ${number}
      </div>
    `,
    iconSize: [isHovered ? 36 : 28, isHovered ? 36 : 28],
    iconAnchor: [isHovered ? 18 : 14, isHovered ? 18 : 14],
    popupAnchor: [0, -20],
  });
}

// Map controller component for animations
function MapController({ 
  activities, 
  hoveredActivity 
}: { 
  activities: Activity[]; 
  hoveredActivity: Activity | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (activities.length > 0) {
      const bounds = L.latLngBounds(activities.map(a => a.coordinates));
      map.fitBounds(bounds, { padding: [80, 80] });
    }
  }, [activities, map]);

  useEffect(() => {
    if (hoveredActivity) {
      map.flyTo(hoveredActivity.coordinates, 15, { duration: 0.5 });
    }
  }, [hoveredActivity, map]);

  return null;
}

export function ItineraryMap({
  activities,
  hoveredActivity,
  selectedActivity,
  onActivitySelect,
  selectedDay,
  totalDays,
  onDayChange,
}: ItineraryMapProps) {
  const [isRouteCardCollapsed, setIsRouteCardCollapsed] = useState(false);
  const [mapStyle, setMapStyle] = useState<"dark" | "satellite">("dark");
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Filter activities with valid coordinates (not 0,0) - memoized to prevent infinite loops
  const validActivities = useMemo(() => 
    activities.filter(
      a => a.coordinates && a.coordinates[0] !== 0 && a.coordinates[1] !== 0
    ),
    [activities]
  );

  // Fetch actual road route when activities change
  const fetchRoute = useCallback(async () => {
    if (validActivities.length < 2) {
      setRouteCoordinates(validActivities.map(a => a.coordinates));
      return;
    }

    setIsLoadingRoute(true);
    const activityCoords = validActivities.map(a => a.coordinates);
    const roadRoute = await fetchRouteFromOSRM(activityCoords);
    setRouteCoordinates(roadRoute);
    setIsLoadingRoute(false);
  }, [validActivities]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  // Calculate center point from valid activities
  const centerLat = validActivities.length > 0 
    ? validActivities.reduce((sum, a) => sum + a.coordinates[0], 0) / validActivities.length
    : 0;
  const centerLng = validActivities.length > 0
    ? validActivities.reduce((sum, a) => sum + a.coordinates[1], 0) / validActivities.length
    : 0;

  // Get type icon
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
      case "flight": return "Flight";
      case "hotel": return "Hotel";
      case "restaurant": return "Restaurant";
      case "attraction": return "Attraction";
      case "transport": return "Transport";
      default: return "Location";
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Show message if no valid coordinates */}
      {validActivities.length === 0 ? (
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
                📍 {activity.location?.split(',')[0] || activity.title}
              </span>
            ))}
            {activities.length > 5 && (
              <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400">
                +{activities.length - 5} more
              </span>
            )}
          </div>
        </div>
      ) : (
      <MapContainer
        center={[centerLat || 41.9028, centerLng || 12.4964]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          key={mapStyle}
          attribution={mapStyle === "dark" 
            ? '&copy; <a href="https://carto.com/">CARTO</a>'
            : '&copy; <a href="https://www.esri.com/">Esri</a>'
          }
          url={mapStyle === "dark"
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          }
        />
        
        <MapController activities={validActivities} hoveredActivity={hoveredActivity || selectedActivity} />

        {/* Route Line - follows actual roads */}
        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: "#3b82f6",
              weight: 5,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* Route outline for better visibility */}
        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: "#1e3a5f",
              weight: 8,
              opacity: 0.5,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* Activity Markers */}
        {validActivities.map((activity, index) => (
          <Marker
            key={activity.id}
            position={activity.coordinates}
            icon={createNumberedIcon(index + 1, hoveredActivity?.id === activity.id || selectedActivity?.id === activity.id)}
            eventHandlers={{
              click: () => onActivitySelect(selectedActivity?.id === activity.id ? null : activity),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="text-xs text-zinc-500 mb-1">{activity.time}</div>
                <div className="font-semibold text-zinc-900 mb-1">{activity.title}</div>
                <div className="text-xs text-zinc-600">{activity.location}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      )}

      {/* Route Loading Indicator */}
      {validActivities.length > 0 && isLoadingRoute && (
        <div className="absolute top-4 left-4 z-[1000] px-3 py-2 rounded-lg bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-300">Loading route...</span>
        </div>
      )}

      {/* Day Navigation - only show when we have valid coordinates */}
      {validActivities.length > 0 && (
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
          Day {selectedDay} - Arrival & Exploration
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
      )}

      {/* Map Controls */}
      {validActivities.length > 0 && (
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2">
        {/* Map Style Toggle Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setMapStyle(mapStyle === "dark" ? "satellite" : "dark")}
          className={`w-9 h-9 rounded-lg backdrop-blur-sm border flex items-center justify-center transition-all ${
            mapStyle === "satellite" 
              ? "bg-blue-500/20 border-blue-500/50 text-blue-400" 
              : "bg-zinc-900/90 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
          }`}
          title={mapStyle === "dark" ? "Switch to Satellite" : "Switch to Dark"}
        >
          {mapStyle === "dark" ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </motion.button>

        {/* Other Controls */}
        {[
          { icon: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8", label: "Navigate" },
          { icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z", label: "Location" },
          { icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", label: "Map" },
          { icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", label: "Hotels" },
          { icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z", label: "Shopping" },
          { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: "Time" },
        ].map((control) => (
          <motion.button
            key={control.label}
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-lg bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
            title={control.label}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={control.icon} />
            </svg>
          </motion.button>
        ))}
      </div>
      )}

      {/* Route Info Card / Activity Card */}
      {validActivities.length > 0 && (
      <AnimatePresence mode="wait">
        {selectedActivity ? (
          /* Activity Details Card */
          <motion.div
            key="activity-card"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-6 right-6 z-[1000] w-80 rounded-2xl bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 overflow-hidden"
          >
            {/* Activity Image */}
            <div className="relative h-36 overflow-hidden">
              <Image
                src={selectedActivity.image}
                alt={selectedActivity.title}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
              
              {/* Close button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onActivitySelect(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>

              {/* Type badge */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 text-xs text-blue-400">
                {getTypeIcon(selectedActivity.type)} {getTypeLabel(selectedActivity.type)}
              </div>

              {/* Activity number */}
              <div className="absolute bottom-3 left-3 w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <span className="text-white font-semibold">
                  {activities.findIndex(a => a.id === selectedActivity.id) + 1}
                </span>
              </div>
            </div>

            <div className="p-4">
              {/* Time */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{selectedActivity.time}</span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-white mb-2">{selectedActivity.title}</h3>

              {/* Location */}
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{selectedActivity.location}</span>
              </div>

              {/* Price */}
              {(selectedActivity.price || selectedActivity.priceNote) && (
                <div className="flex items-center gap-2 text-sm mb-4">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {selectedActivity.price ? (
                    <span>
                      <span className="text-blue-400 font-semibold">{selectedActivity.price}</span>
                      <span className="text-zinc-500"> {selectedActivity.priceNote}</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400">{selectedActivity.priceNote}</span>
                  )}
                </div>
              )}

              {/* Action Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
              >
                {selectedActivity.actionLabel}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          /* Route Info Card - Collapsible */
          <motion.div
            key="route-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`absolute bottom-6 right-6 z-[1000] rounded-2xl bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 overflow-hidden transition-all duration-300 ${
              isRouteCardCollapsed ? "w-14" : "w-72"
            }`}
          >
            {isRouteCardCollapsed ? (
              /* Collapsed State */
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsRouteCardCollapsed(false)}
                className="w-full h-14 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </motion.button>
            ) : (
              /* Expanded State */
              <>
                {/* Airport Preview Image */}
                <div className="relative h-24 overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1529074963764-98f45c47344b?q=80&w=400&auto=format&fit=crop"
                    alt="Airport"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                  
                  {/* Collapse button */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsRouteCardCollapsed(true)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.button>

                  <div className="absolute bottom-2 left-3 w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <span className="text-white font-semibold">1</span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>Car Route</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">40–50 minutes</div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-4">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span>Moderate traffic — taxi is the fastest way to reach your hotel now.</span>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
                  >
                    Book a Taxi
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      )}

      {/* Zoom Controls */}
      {validActivities.length > 0 && (
      <div className="absolute bottom-6 left-20 z-[1000] flex items-center gap-2">
        <span className="text-xs text-zinc-500">40%</span>
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-7 h-7 rounded-md bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-7 h-7 rounded-md bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </motion.button>
      </div>
      )}

      {/* Target/Center Button */}
      {validActivities.length > 0 && (
      <div className="absolute bottom-6 left-6 z-[1000]">
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-lg bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </motion.button>
      </div>
      )}
    </div>
  );
}
