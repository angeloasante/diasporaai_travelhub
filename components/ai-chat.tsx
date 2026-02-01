"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Markdown } from "@/components/markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  itineraryCard?: {
    title: string;
    destination: string;
    days: number;
    budget: string;
    slug?: string | null;
    requiresAuth?: boolean;
  };
}
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
  rating?: number;
  description?: string;
  openingHours?: string;
  popularThings?: { name: string; description: string; image: string }[];
  // Google Places enrichment fields
  placeId?: string;
  userRatingsTotal?: number;
  priceLevel?: number;
  photos?: string[];
  openNow?: boolean;
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

interface AIChatProps {
  isExpanded: boolean;
  onToggle: () => void;
  itineraryContext?: {
    destination: string;
    duration: string;
    currentDay: number;
    activities: string[];
  };
  selectedActivity: Activity | null;
  onActivityClose: () => void;
  pendingMessage?: string | null;
  onPendingMessageSent?: () => void;
}

// Sample popular things for activities
const getPopularThings = (activityType: Activity["type"]) => {
  const items: Record<string, { name: string; description: string; image: string }[]> = {
    attraction: [
      { name: "Mona Lisa", description: "Leonardo da Vinci's iconic painting", image: "https://images.unsplash.com/photo-1423742774270-6884aac775fa?q=80&w=200" },
      { name: "Venus de Milo", description: "Ancient Greek sculpture of Aphrodite", image: "https://images.unsplash.com/photo-1499426600726-ac36ef8c1bee?q=80&w=200" },
      { name: "Cour Carrée", description: "Historic courtyard of the old palace", image: "https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?q=80&w=200" },
      { name: "Winged Victory", description: "Hellenistic sculpture of Nike", image: "https://images.unsplash.com/photo-1545989253-02cc26577f88?q=80&w=200" },
    ],
    restaurant: [
      { name: "Signature Dish", description: "Chef's special recommendation", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200" },
      { name: "Wine Selection", description: "Curated local wines", image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=200" },
    ],
    hotel: [
      { name: "Room View", description: "Stunning city views", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=200" },
      { name: "Amenities", description: "Premium hotel facilities", image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=200" },
    ],
  };
  return items[activityType] || items.attraction;
};

export function AIChat({ 
  isExpanded, 
  onToggle, 
  itineraryContext: _itineraryContext, // Reserved for future use
  selectedActivity,
  onActivityClose,
  pendingMessage,
  onPendingMessageSent,
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "activities" | "tickets" | "location" | "review">("overview");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use Google Places photos if available, fallback to defaults
  const activityImages = selectedActivity ? (
    selectedActivity.photos?.length 
      ? selectedActivity.photos.slice(0, 5)
      : [
          selectedActivity.image,
          "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=600",
          "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600",
        ]
  ) : [];

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Use the itinerary chat API for proper conversation persistence and document creation
      const response = await fetch("/api/itinerary/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content.trim(),
          conversationId,
          history: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      
      // Update conversation ID if returned
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "",
        timestamp: new Date(),
        itineraryCard: data.document ? {
          title: data.document.title,
          destination: data.document.destination,
          days: Array.isArray(data.document.days) ? data.document.days.length : data.document.days || 0,
          budget: data.document.avg_cost || "TBD",
          slug: data.document.slug,
          requiresAuth: data.document.requiresAuth,
        } : data.itineraryCard,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, conversationId]);

  // Scroll to bottom when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally scroll on message count change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  // Handle pending message from parent (when quick action is clicked)
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only run when expanded with pending message
  useEffect(() => {
    if (isExpanded && pendingMessage && !isLoading) {
      sendMessage(pendingMessage);
      onPendingMessageSent?.();
    }
  }, [isExpanded, pendingMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  // Collapsed state - don't render anything (the card is rendered in the parent)
  if (!isExpanded) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="ai-chat-expanded"
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 z-50 flex"
      >
        {/* Chat Panel */}
        <div className="w-[400px] h-full bg-[#0a0a0c] border-r border-zinc-800 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-white font-medium">Diaspora AI 4.0</span>
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onToggle}
                className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </motion.button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-white font-medium mb-2">Start a Conversation</h3>
                <p className="text-sm text-zinc-500 mb-6">Ask me anything about your trip!</p>
                
                {/* Quick suggestions */}
                <div className="space-y-2">
                  {[
                    "Can you make me a 5-day itinerary for Paris?",
                    "What are the best restaurants in Rome?",
                    "Help me plan a budget trip to Japan",
                  ].map((suggestion) => (
                    <motion.button
                      key={suggestion}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSuggestion(suggestion)}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-sm text-zinc-300 text-left hover:bg-zinc-800 hover:border-zinc-600 transition-all"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm ${
                        message.role === "user"
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-zinc-800 text-zinc-200 rounded-bl-md"
                      }`}
                    >
                      {message.role === "user" ? (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      ) : (
                        <Markdown content={message.content} />
                      )}
                    </div>

                    {/* Itinerary Card */}
                    {message.itineraryCard && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3"
                      >
                        {message.itineraryCard.requiresAuth ? (
                          // Show sign-in prompt for unauthenticated users
                          <a
                            href="/auth/login"
                            className="block w-full px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left hover:bg-amber-500/20 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-amber-400">{message.itineraryCard.title}</div>
                                <div className="text-xs text-zinc-500">
                                  {message.itineraryCard.days} days · Sign in to save this itinerary
                                </div>
                              </div>
                              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </a>
                        ) : message.itineraryCard.slug ? (
                          // Show clickable card linking to saved itinerary
                          <a
                            href={`/itinerary/${message.itineraryCard.slug}`}
                            className="block w-full px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-left hover:bg-blue-500/20 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-blue-400">{message.itineraryCard.title}</div>
                                <div className="text-xs text-zinc-500">
                                  {message.itineraryCard.days} days · {message.itineraryCard.budget}
                                </div>
                              </div>
                              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </a>
                        ) : (
                          // Show non-clickable card (fallback)
                          <div className="w-full px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-blue-400">{message.itineraryCard.title}</div>
                                <div className="text-xs text-zinc-500">
                                  {message.itineraryCard.days} days · {message.itineraryCard.budget}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="px-4 py-3 rounded-2xl bg-zinc-800 rounded-bl-md">
                  <div className="flex gap-1">
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-2 h-2 rounded-full bg-zinc-500"
                    />
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      className="w-2 h-2 rounded-full bg-zinc-500"
                    />
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      className="w-2 h-2 rounded-full bg-zinc-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-zinc-800">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask anything..."
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </motion.button>
              <motion.button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </motion.button>
            </form>
            <div className="mt-2 text-center">
              <span className="text-xs text-zinc-600">Diaspora AImay make errors. Check important information.</span>
            </div>
          </div>
        </div>

        {/* Activity Detail Panel - Shows when activity is selected */}
        <AnimatePresence>
          {selectedActivity && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-[420px] h-full bg-[#0f0f11] border-r border-zinc-800 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onActivityClose}
                    className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </motion.button>
                  <span className="text-white text-sm">Day 2: Explore Parisian Art & History</span>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onActivityClose}
                  className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* Image Carousel */}
                <div className="relative aspect-[4/3]">
                  <Image
                    src={activityImages[currentImageIndex] || selectedActivity.image}
                    alt={selectedActivity.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  
                  {/* Carousel Controls */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    {/* Thumbnail indicators */}
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-black/40 backdrop-blur-sm">
                      {activityImages.map((img) => (
                        <button
                          key={`thumb-${img}`}
                          type="button"
                          onClick={() => setCurrentImageIndex(activityImages.indexOf(img))}
                          className={`w-8 h-8 rounded-lg overflow-hidden border-2 transition-all ${
                            activityImages.indexOf(img) === currentImageIndex ? "border-white" : "border-transparent opacity-60"
                          }`}
                        >
                          <Image src={img} alt="" width={32} height={32} className="object-cover w-full h-full" unoptimized />
                        </button>
                      ))}
                    </div>
                    
                    {/* Fullscreen */}
                    <button
                      type="button"
                      className="w-10 h-10 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>

                  {/* Navigation Arrows */}
                  <div className="absolute right-4 bottom-4 flex gap-2">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? activityImages.length - 1 : prev - 1))}
                      className="w-10 h-10 rounded-full bg-zinc-800/90 border border-zinc-700 flex items-center justify-center text-white"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setCurrentImageIndex((prev) => (prev === activityImages.length - 1 ? 0 : prev + 1))}
                      className="w-10 h-10 rounded-full bg-zinc-800/90 border border-zinc-700 flex items-center justify-center text-white"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  </div>
                </div>

                {/* Activity Info */}
                <div className="p-6">
                  {/* Title & Rating */}
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">{selectedActivity.title}</h2>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm text-white font-medium">{selectedActivity.rating || 4.8}</span>
                      <span className="text-sm text-zinc-500">/5</span>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400 mb-6">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>from <span className="text-blue-400">{selectedActivity.price || "$20.00"}</span></span>
                    </div>
                    <span className="text-zinc-600">|</span>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{selectedActivity.openingHours || "Open soon"}</span>
                    </div>
                    <span className="text-zinc-600">|</span>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span>{selectedActivity.location}</span>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-6 border-b border-zinc-800 mb-6">
                    {(["overview", "activities", "tickets", "location", "review"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-medium capitalize transition-colors relative ${
                          activeTab === tab ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {tab}
                        {activeTab === tab && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <AnimatePresence mode="wait">
                    {activeTab === "overview" && (
                      <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                          {selectedActivity.description || 
                            `The ${selectedActivity.title} is a must-visit destination. Home to masterpieces and historic landmarks, it spans centuries of art and history—from ancient civilizations to Renaissance...`}
                          <button type="button" className="text-blue-400 ml-1 hover:underline">Read more</button>
                        </p>

                        {/* Popular Things */}
                        <h3 className="text-lg font-semibold text-white mb-4">Popular Things</h3>
                        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
                          {getPopularThings(selectedActivity.type).map((item, idx) => (
                            <motion.div
                              key={`popular-${item.name}-${idx}`}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="flex-shrink-0 w-32"
                            >
                              <div className="w-32 h-24 rounded-xl overflow-hidden mb-2 relative">
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                              <h4 className="text-sm font-medium text-white truncate">{item.name}</h4>
                              <p className="text-xs text-zinc-500 truncate">{item.description}</p>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "tickets" && (
                      <motion.div
                        key="tickets"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                      >
                        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="text-white font-medium">Standard Entry</h4>
                              <p className="text-sm text-zinc-500">Access to main areas</p>
                            </div>
                            <div className="text-right">
                              <div className="text-blue-400 font-semibold">{selectedActivity.price || "$20.00"}</div>
                              <div className="text-xs text-zinc-500">per person</div>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="text-white font-medium">Skip the Line</h4>
                              <p className="text-sm text-zinc-500">Priority access + audio guide</p>
                            </div>
                            <div className="text-right">
                              <div className="text-blue-400 font-semibold">$45.00</div>
                              <div className="text-xs text-zinc-500">per person</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "location" && (
                      <motion.div
                        key="location"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <div>
                              <h4 className="text-white font-medium mb-1">{selectedActivity.location}</h4>
                              <p className="text-sm text-zinc-500">Coordinates: {selectedActivity.coordinates.join(", ")}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "review" && (
                      <motion.div
                        key="review"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center py-8"
                      >
                        <p className="text-zinc-500">No reviews yet</p>
                      </motion.div>
                    )}

                    {activeTab === "activities" && (
                      <motion.div
                        key="activities"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center py-8"
                      >
                        <p className="text-zinc-500">Activities coming soon</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 border-t border-zinc-800">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
                >
                  {selectedActivity.actionLabel}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close button for entire panel */}
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          className="absolute top-1/2 -translate-y-1/2 -right-4 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
