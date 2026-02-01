"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AIChat } from "@/components/ai-chat";
import { supabase } from "@/lib/supabase";
import { getFromCache, setInCache, CACHE_KEYS } from "@/lib/cache";
import type { ComponentType } from "react";

// Types for the map component
interface MapActivity {
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
  activities: MapActivity[];
  hoveredActivity: MapActivity | null;
  selectedActivity: MapActivity | null;
  onActivitySelect: (activity: MapActivity | null) => void;
  selectedDay: number;
  totalDays: number;
  onDayChange: (day: number) => void;
  documentId?: string;
  onReGeocodeComplete?: () => void;
}

// Dynamically import the map component to avoid SSR issues
const ItineraryMap = dynamic(
  () => import("./itinerary-map-google").then(mod => mod.ItineraryMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading map...</div>
      </div>
    ),
  }
) as ComponentType<ItineraryMapProps>;

// Types
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
  // Google Places enrichment fields
  placeId?: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  photos?: string[];
  openNow?: boolean;
  openingHours?: string; // Joined string from array
  website?: string;
  phoneNumber?: string;
  googleMapsUrl?: string;
  editorialSummary?: string;
  bookingUrl?: string;
  topReview?: {
    authorName: string;
    rating: number;
    text: string;
  };
}

interface DaySchedule {
  day: number;
  date: string;
  title: string;
  activities: Activity[];
}

interface Itinerary {
  id: string;
  title: string;
  duration: string;
  description: string;
  country: string;
  countryFlag: string;
  dates: string;
  travelers: string;
  avgCost: string;
  days: DaySchedule[];
}

// Sample Data
const sampleItinerary: Itinerary = {
  id: "rome-getaway",
  title: "Rome Getaway",
  duration: "5 Days Trip",
  description: "A 5-day escape through Rome's timeless landmarks, local cuisine, and hidden gems — from the Colosseum to charming Trastevere.",
  country: "Italy",
  countryFlag: "🇮🇹",
  dates: "Oct 12-16",
  travelers: "2 Adults",
  avgCost: "$1,200.00 Avg.",
  days: [
    {
      day: 1,
      date: "October 12",
      title: "Arrival & Exploration",
      activities: [
        {
          id: "1",
          time: "10:30 AM",
          title: "Fiumicino Airport (Arrival)",
          type: "flight",
          location: "Leonardo da Vinci Intl. Airport",
          priceNote: "Included in Flight Ticket",
          image: "https://images.unsplash.com/photo-1529074963764-98f45c47344b?q=80&w=300&auto=format&fit=crop",
          actionLabel: "Book a Flight",
          coordinates: [41.8003, 12.2389],
        },
        {
          id: "2",
          time: "12:00 PM",
          title: "Albergo Roma (Hotel Check-in)",
          type: "hotel",
          location: "City Center, Rome",
          price: "$130.00",
          priceNote: "per night",
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=300&auto=format&fit=crop",
          actionLabel: "View Booking",
          coordinates: [41.8967, 12.4822],
        },
        {
          id: "3",
          time: "1:00 PM",
          title: "Trattoria da Enzo al 29 (Lunch)",
          type: "restaurant",
          location: "Trastevere, Rome",
          price: "$27.00",
          priceNote: "per person",
          image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=300&auto=format&fit=crop",
          actionLabel: "Reserve Table",
          coordinates: [41.8892, 12.4695],
        },
        {
          id: "4",
          time: "3:00 PM",
          title: "Colosseum & Roman Forum",
          type: "attraction",
          location: "Piazza del Colosseo, Rome",
          price: "$20.00",
          priceNote: "per ticket",
          image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=300&auto=format&fit=crop",
          actionLabel: "Book Ticket",
          coordinates: [41.8902, 12.4922],
        },
        {
          id: "5",
          time: "7:30 PM",
          title: "Dinner at Roscioli",
          type: "restaurant",
          location: "Via dei Giubbonari, Rome",
          price: "$45.00",
          priceNote: "per person",
          image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=300&auto=format&fit=crop",
          actionLabel: "Reserve Table",
          coordinates: [41.8955, 12.4749],
        },
      ],
    },
    {
      day: 2,
      date: "October 13",
      title: "Vatican & Art",
      activities: [
        {
          id: "6",
          time: "8:00 AM",
          title: "Breakfast at Hotel",
          type: "restaurant",
          location: "Albergo Roma",
          priceNote: "Included",
          image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=300&auto=format&fit=crop",
          actionLabel: "View Details",
          coordinates: [41.8967, 12.4822],
        },
        {
          id: "7",
          time: "9:30 AM",
          title: "Vatican Museums & Sistine Chapel",
          type: "attraction",
          location: "Vatican City",
          price: "$35.00",
          priceNote: "per ticket",
          image: "https://images.unsplash.com/photo-1531572753322-ad063cecc140?q=80&w=300&auto=format&fit=crop",
          actionLabel: "Book Ticket",
          coordinates: [41.9065, 12.4536],
        },
        {
          id: "8",
          time: "1:00 PM",
          title: "St. Peter's Basilica",
          type: "attraction",
          location: "Vatican City",
          priceNote: "Free Entry",
          image: "https://images.unsplash.com/photo-1568797629192-789acf8e4df3?q=80&w=300&auto=format&fit=crop",
          actionLabel: "View Info",
          coordinates: [41.9022, 12.4539],
        },
      ],
    },
    {
      day: 3,
      date: "October 14",
      title: "Historic Center",
      activities: [
        {
          id: "9",
          time: "10:00 AM",
          title: "Trevi Fountain",
          type: "attraction",
          location: "Piazza di Trevi, Rome",
          priceNote: "Free",
          image: "https://images.unsplash.com/photo-1525874684015-58379d421a52?q=80&w=300&auto=format&fit=crop",
          actionLabel: "View Info",
          coordinates: [41.9009, 12.4833],
        },
        {
          id: "10",
          time: "12:00 PM",
          title: "Pantheon",
          type: "attraction",
          location: "Piazza della Rotonda, Rome",
          price: "$5.00",
          priceNote: "per ticket",
          image: "https://images.unsplash.com/photo-1583265627959-fb7042f5133b?q=80&w=300&auto=format&fit=crop",
          actionLabel: "Book Ticket",
          coordinates: [41.8986, 12.4769],
        },
      ],
    },
  ],
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
};

// Activity Card Component
function ActivityCard({ 
  activity, 
  index, 
  isLast,
  isSelected,
  onHover,
  onSelect 
}: { 
  activity: Activity; 
  index: number; 
  isLast: boolean;
  isSelected: boolean;
  onHover: (activity: Activity | null) => void;
  onSelect: (activity: Activity | null) => void;
}) {
  return (
    <motion.div
      variants={itemVariants}
      onMouseEnter={() => onHover(activity)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(isSelected ? null : activity)}
      className="relative flex gap-4"
    >
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium z-10 transition-all duration-300 ${
            isSelected 
              ? "bg-blue-500 border-2 border-blue-400 text-white" 
              : "bg-zinc-800 border-2 border-zinc-700 text-white"
          }`}
        >
          {index + 1}
        </motion.div>
        {!isLast && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: index * 0.1 + 0.4, duration: 0.3 }}
            className="w-0.5 flex-1 bg-gradient-to-b from-zinc-700 to-zinc-800 origin-top"
          />
        )}
      </div>

      {/* Card */}
      <motion.div
        whileHover={{ scale: 1.02, x: 4 }}
        className={`flex-1 mb-4 p-4 rounded-2xl bg-zinc-900/80 border transition-all cursor-pointer ${
          isSelected 
            ? "border-blue-500/50 ring-1 ring-blue-500/20" 
            : "border-zinc-800 hover:border-blue-500/30"
        }`}
      >
        <div className="flex gap-4">
          {/* Image */}
          <div className="w-24 h-20 rounded-xl overflow-hidden flex-shrink-0 relative">
            <Image
              src={activity.image}
              alt={activity.title}
              fill
              className="object-cover"
              unoptimized
            />
            {/* Open Now Badge */}
            {activity.openNow !== undefined && (
              <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                activity.openNow ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
              }`}>
                {activity.openNow ? "Open" : "Closed"}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <span>{activity.time}</span>
              {/* Google Rating */}
              {activity.rating && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-yellow-400 font-medium">{activity.rating.toFixed(1)}</span>
                  {activity.userRatingsTotal && (
                    <span className="text-zinc-500">({activity.userRatingsTotal.toLocaleString()})</span>
                  )}
                </div>
              )}
            </div>
            <h4 className="text-white font-medium mb-1 truncate">
              {activity.title}
            </h4>
            <div className="flex items-center gap-1 text-xs text-zinc-400 mb-2">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span className="truncate">{activity.location}</span>
              {activity.googleMapsUrl && (
                <a 
                  href={activity.googleMapsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              {/* Price */}
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {activity.price ? (
                  <span>
                    <span className="text-blue-400">{activity.price}</span>
                    {activity.priceNote && <span className="text-zinc-500"> {activity.priceNote}</span>}
                  </span>
                ) : activity.priceLevel !== undefined ? (
                  <span className="text-blue-400">
                    {["Free", "$", "$$", "$$$", "$$$$"][activity.priceLevel] || ""}
                  </span>
                ) : (
                  <span className="text-zinc-500">{activity.priceNote || "Price varies"}</span>
                )}
              </div>
              {/* Website link */}
              {activity.website && (
                <a 
                  href={activity.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-zinc-400 hover:text-blue-400"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span>Website</span>
                </a>
              )}
            </div>
          </div>

          {/* Action Button - Now with booking link */}
          <div className="flex-shrink-0">
            {activity.bookingUrl ? (
              <motion.a
                href={activity.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex px-4 py-2 rounded-xl bg-blue-600 border border-blue-500 text-sm text-white hover:bg-blue-500 transition-all"
              >
                {activity.actionLabel}
              </motion.a>
            ) : (
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-blue-400 hover:bg-zinc-700 hover:border-blue-500/50 transition-all"
              >
                {activity.actionLabel}
              </motion.button>
            )}
          </div>
        </div>

        {/* Top Review - Show when expanded/selected */}
        {isSelected && activity.topReview && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 pt-3 border-t border-zinc-800"
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
                <span className="text-xs text-zinc-400">
                  {activity.topReview.authorName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400">{activity.topReview.authorName}</span>
                  <div className="flex items-center text-yellow-400">
                    {Array.from({ length: activity.topReview.rating }).map((_, i) => (
                      <svg key={`star-${activity.id}-${i}`} className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                  &ldquo;{activity.topReview.text}&rdquo;
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Editorial Summary - Show when expanded/selected */}
        {isSelected && activity.editorialSummary && !activity.topReview && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 pt-3 border-t border-zinc-800"
          >
            <p className="text-xs text-zinc-400 line-clamp-2">
              {activity.editorialSummary}
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Main Component
export function ItineraryDetail({ itineraryId }: { itineraryId: string }) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(1);
  const [hoveredActivity, setHoveredActivity] = useState<Activity | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  const [isAIChatExpanded, setIsAIChatExpanded] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Refresh itinerary data without full page reload
  const refreshItinerary = useCallback(async () => {
    if (!itineraryId) return;
    
    try {
      const response = await fetch(`/api/itinerary/documents/${itineraryId}`);
      if (!response.ok) return;
      
      const data = await response.json();
      const doc = data.document;
      
      // Transform database format to component format
      const transformedItinerary: Itinerary = {
        id: doc.id,
        title: doc.title,
        duration: doc.duration || `${doc.days?.length || 0} Days Trip`,
        description: doc.description || "",
        country: doc.country || doc.destination?.split(",")[1]?.trim() || "",
        countryFlag: doc.country_flag || "🌍",
        dates: doc.dates || "Flexible",
        travelers: doc.travelers || "2 Adults",
        avgCost: doc.avg_cost || "$0.00 Avg.",
        days: (doc.days || []).map((day: { day_number: number; date?: string; title: string; description?: string; activities?: Array<{ id: string; time?: string; title: string; type?: string; location?: string; price?: string; price_note?: string; image?: string; action_label?: string; latitude?: number; longitude?: number; place_id?: string; rating?: number; user_ratings_total?: number; price_level?: number; photos?: string[]; open_now?: boolean; opening_hours?: string[]; website?: string; phone_number?: string; google_maps_url?: string; editorial_summary?: string; booking_url?: string; top_review?: { author_name: string; rating: number; text: string } }> }) => ({
          day: day.day_number,
          date: day.date || `Day ${day.day_number}`,
          title: day.title,
          activities: (day.activities || []).map((act: { id: string; time?: string; title: string; type?: string; location?: string; price?: string; price_note?: string; image?: string; action_label?: string; latitude?: number; longitude?: number; place_id?: string; rating?: number; user_ratings_total?: number; price_level?: number; photos?: string[]; open_now?: boolean; opening_hours?: string[]; website?: string; phone_number?: string; google_maps_url?: string; editorial_summary?: string; booking_url?: string; top_review?: { author_name: string; rating: number; text: string } }, idx: number) => ({
            id: act.id || `${day.day_number}-${idx}`,
            time: act.time || "",
            title: act.title,
            type: act.type || "attraction",
            location: act.location || "",
            price: act.price,
            priceNote: act.price_note || "",
            image: act.image || act.photos?.[0] || `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300&auto=format&fit=crop`,
            actionLabel: act.action_label || "View Details",
            coordinates: [act.latitude || 0, act.longitude || 0] as [number, number],
            // Google Places enrichment fields
            placeId: act.place_id,
            rating: act.rating,
            userRatingsTotal: act.user_ratings_total,
            priceLevel: act.price_level,
            photos: act.photos,
            openNow: act.open_now,
            openingHours: act.opening_hours?.join(" | "),
            website: act.website,
            phoneNumber: act.phone_number,
            googleMapsUrl: act.google_maps_url,
            editorialSummary: act.editorial_summary,
            bookingUrl: act.booking_url,
            topReview: act.top_review ? {
              authorName: act.top_review.author_name,
              rating: act.top_review.rating,
              text: act.top_review.text,
            } : undefined,
          })),
        })),
      };
      
      setItinerary(transformedItinerary);
      setLastUpdated(new Date());
      console.log("Itinerary refreshed at", new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error refreshing itinerary:", err);
    }
  }, [itineraryId]);

  // Close dropdown when clicking outside - must be before conditional returns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDayDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set up Supabase real-time subscription for activity updates
  useEffect(() => {
    if (!supabase || !documentId) return;
    
    console.log("Setting up real-time subscription for document:", documentId);
    
    // Subscribe to changes in itinerary_activities table
    const channel = supabase
      .channel(`itinerary-${documentId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "itinerary_activities",
        },
        (payload) => {
          console.log("Real-time update received:", payload);
          // Refresh the itinerary when activities change
          refreshItinerary();
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });
    
    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [documentId, refreshItinerary]);

  // Fetch itinerary data
  useEffect(() => {
    const fetchItinerary = async () => {
      // Check cache first
      const cached = getFromCache<Itinerary>(CACHE_KEYS.itinerary(itineraryId), 10 * 60 * 1000);
      if (cached) {
        setItinerary(cached);
        setIsLoading(false);
        // Still fetch fresh data in background for real-time updates
        fetchFreshData(false);
        return;
      }
      
      await fetchFreshData(true);
    };
    
    const fetchFreshData = async (showLoading: boolean) => {
      try {
        if (showLoading) setIsLoading(true);
        const response = await fetch(`/api/itinerary/documents/${itineraryId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            // Fallback to sample data if not found
            setItinerary(sampleItinerary);
          } else {
            throw new Error("Failed to fetch itinerary");
          }
          return;
        }
        
        const data = await response.json();
        const doc = data.document;
        
        // Store the document ID for re-geocoding
        setDocumentId(doc.id);
        
        // Transform database format to component format
        const transformedItinerary: Itinerary = {
          id: doc.id,
          title: doc.title,
          duration: doc.duration || `${doc.days?.length || 0} Days Trip`,
          description: doc.description || "",
          country: doc.country || doc.destination?.split(",")[1]?.trim() || "",
          countryFlag: doc.country_flag || "🌍",
          dates: doc.dates || "Flexible",
          travelers: doc.travelers || "2 Adults",
          avgCost: doc.avg_cost || "$0.00 Avg.",
          days: (doc.days || []).map((day: { day_number: number; date?: string; title: string; description?: string; activities?: Array<{ id: string; time?: string; title: string; type?: string; location?: string; price?: string; price_note?: string; image?: string; action_label?: string; latitude?: number; longitude?: number; place_id?: string; rating?: number; user_ratings_total?: number; price_level?: number; photos?: string[]; open_now?: boolean; opening_hours?: string[]; website?: string; phone_number?: string; google_maps_url?: string; editorial_summary?: string; booking_url?: string; top_review?: { author_name: string; rating: number; text: string } }> }) => ({
            day: day.day_number,
            date: day.date || `Day ${day.day_number}`,
            title: day.title,
            activities: (day.activities || []).map((act: { id: string; time?: string; title: string; type?: string; location?: string; price?: string; price_note?: string; image?: string; action_label?: string; latitude?: number; longitude?: number; place_id?: string; rating?: number; user_ratings_total?: number; price_level?: number; photos?: string[]; open_now?: boolean; opening_hours?: string[]; website?: string; phone_number?: string; google_maps_url?: string; editorial_summary?: string; booking_url?: string; top_review?: { author_name: string; rating: number; text: string } }, idx: number) => ({
              id: act.id || `${day.day_number}-${idx}`,
              time: act.time || "",
              title: act.title,
              type: act.type || "attraction",
              location: act.location || "",
              price: act.price,
              priceNote: act.price_note || "",
              image: act.image || act.photos?.[0] || `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300&auto=format&fit=crop`,
              actionLabel: act.action_label || "View Details",
              coordinates: [act.latitude || 0, act.longitude || 0] as [number, number],
              // Google Places enrichment fields
              placeId: act.place_id,
              rating: act.rating,
              userRatingsTotal: act.user_ratings_total,
              priceLevel: act.price_level,
              photos: act.photos,
              openNow: act.open_now,
              openingHours: act.opening_hours?.join(" | "),
              website: act.website,
              phoneNumber: act.phone_number,
              googleMapsUrl: act.google_maps_url,
              editorialSummary: act.editorial_summary,
              bookingUrl: act.booking_url,
              topReview: act.top_review ? {
                authorName: act.top_review.author_name,
                rating: act.top_review.rating,
                text: act.top_review.text,
              } : undefined,
            })),
          })),
        };
        
        setItinerary(transformedItinerary);
        setLastUpdated(new Date());
        
        // Cache the transformed itinerary
        setInCache(CACHE_KEYS.itinerary(itineraryId), transformedItinerary);
        
        // Check if any activities are missing coordinates and trigger geocoding
        const hasMissingCoords = transformedItinerary.days.some(day => 
          day.activities.some(act => act.coordinates[0] === 0 && act.coordinates[1] === 0)
        );
        
        if (hasMissingCoords && doc.id) {
          // Trigger background geocoding
          fetch("/api/itinerary/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId: doc.id }),
          })
            .then(res => res.json())
            .then(result => {
              if (result.geocoded > 0) {
                // Refresh the itinerary to get updated coordinates (without page reload)
                console.log(`Geocoded ${result.geocoded} activities, refreshing...`);
                setTimeout(() => {
                  refreshItinerary();
                }, 500);
              }
            })
            .catch(err => console.error("Background geocoding failed:", err));
        }
      } catch (err) {
        console.error("Error fetching itinerary:", err);
        setError("Failed to load itinerary");
        // Fallback to sample data
        setItinerary(sampleItinerary);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    };

    fetchItinerary();
  }, [itineraryId, refreshItinerary]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400">Loading itinerary...</span>
        </div>
      </div>
    );
  }

  // Error state with fallback
  if (error && !itinerary) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-zinc-400">{error}</p>
          <button 
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!itinerary) return null;

  const currentDay = itinerary.days.find(d => d.day === selectedDay) || itinerary.days[0];

  // Prepare AI context
  const aiContext = {
    destination: itinerary.country,
    duration: itinerary.duration,
    currentDay: selectedDay,
    activities: currentDay?.activities?.map(a => a.title) || [],
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Itinerary Details */}
      <div className="w-full lg:w-[650px] xl:w-[700px] h-full overflow-y-auto border-r border-zinc-800 scrollbar-hide">
        <div className="p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.1, x: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => router.back()}
                className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              <span className="text-zinc-400 text-sm">Itinerary Detail</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Refresh Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => refreshItinerary()}
                className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
                title="Refresh itinerary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </motion.button>
              {[
                { icon: "M12 4v16m8-8H4", label: "Add" },
                { icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4", label: "Download" },
                { icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z", label: "Share" },
                { icon: "M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z", label: "More" },
              ].map((action) => (
                <motion.button
                  key={action.label}
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                  </svg>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Trip Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold text-white mb-2">
              {itinerary.title} — {itinerary.duration}
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {itinerary.description}
            </p>
          </motion.div>

          {/* Trip Metadata */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-zinc-800"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 text-sm">
              <span>{itinerary.countryFlag}</span>
              <span className="text-zinc-300">{itinerary.country}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{itinerary.dates}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{itinerary.travelers}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{itinerary.avgCost}</span>
            </div>

            {/* Day Selector */}
            <div className="ml-auto relative" ref={dropdownRef}>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDayDropdown(!showDayDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white hover:border-zinc-600 transition-all"
              >
                <span>Day {selectedDay}</span>
                <svg className={`w-4 h-4 transition-transform ${showDayDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.button>
              
              <AnimatePresence>
                {showDayDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-40 rounded-xl bg-zinc-800 border border-zinc-700 shadow-xl overflow-hidden z-50"
                  >
                    {itinerary.days.map((day) => (
                      <button
                        key={day.day}
                        type="button"
                        onClick={() => {
                          setSelectedDay(day.day);
                          setShowDayDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                          selectedDay === day.day
                            ? "bg-blue-500/20 text-blue-400"
                            : "text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        Day {day.day} - {day.date.split(" ")[1]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Day Header */}
          <motion.div
            key={currentDay.day}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <span>Day {currentDay.day}</span>
                <span>·</span>
                <span>{currentDay.date}</span>
              </div>
              <h2 className="text-xl font-semibold text-white">{currentDay.title}</h2>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </motion.button>
          </motion.div>

          {/* Activities Timeline */}
          <motion.div
            key={`activities-${currentDay.day}`}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {currentDay.activities.map((activity, index) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                index={index}
                isLast={index === currentDay.activities.length - 1}
                isSelected={selectedActivity?.id === activity.id}
                onHover={setHoveredActivity}
                onSelect={setSelectedActivity}
              />
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Map */}
      <div className="hidden lg:block flex-1 relative">
        <ItineraryMap
          activities={currentDay.activities}
          hoveredActivity={hoveredActivity}
          selectedActivity={selectedActivity}
          onActivitySelect={setSelectedActivity}
          selectedDay={selectedDay}
          totalDays={itinerary.days.length}
          onDayChange={setSelectedDay}
          documentId={documentId || undefined}
          onReGeocodeComplete={() => {
            // Refresh the itinerary to get updated coordinates (no page reload needed)
            refreshItinerary();
          }}
        />
        
        {/* Last Updated Indicator */}
        {lastUpdated && (
          <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-zinc-900/90 backdrop-blur-sm rounded-lg border border-zinc-700 text-xs text-zinc-400 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* AI Chat */}
      <AIChat
        isExpanded={isAIChatExpanded}
        onToggle={() => setIsAIChatExpanded(!isAIChatExpanded)}
        itineraryContext={aiContext}
        selectedActivity={selectedActivity}
        onActivityClose={() => setSelectedActivity(null)}
      />
    </div>
  );
}
