"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { MapInvalidator } from "@/components/map-invalidator";
import { Markdown } from "@/components/markdown";
import "leaflet/dist/leaflet.css";

// Dynamically import map to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

// MapInvalidator needs to be inside the component to access state
// We'll create it as a separate component file or use useMapEvents

interface DocumentActivity {
  id?: string;
  time?: string;
  title: string;
  type?: string;
  location?: string;
  description?: string;
  price?: string;
}

interface DocumentDay {
  id?: string;
  day_number: number;
  title: string;
  description?: string;
  activities?: DocumentActivity[];
}

interface DocumentAttachment {
  id: string;
  slug: string | null;
  title: string;
  destination?: string;
  country?: string;
  country_flag?: string;
  duration?: string;
  description?: string;
  dates?: string;
  travelers?: string;
  avg_cost?: string;
  days?: number | DocumentDay[];
  cover_image?: string;
  requiresAuth?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  document?: DocumentAttachment;
  itineraryCard?: {
    title: string;
    days: string[];
    duration: string;
  };
}

interface Activity {
  id: string;
  day: number;
  title: string;
  name: string;
  image: string;
  rating: number;
  price: string;
  status: string;
  location: string;
  coordinates: [number, number];
  description: string;
  popularThings: Array<{
    name: string;
    image: string;
    description: string;
  }>;
}

// Sample activities data
const sampleActivities: Activity[] = [
  {
    id: "louvre",
    day: 2,
    title: "Explore Parisian Art & History",
    name: "Musée du Louvre",
    image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800",
    rating: 4.8,
    price: "$20.00",
    status: "Open soon",
    location: "Paris, France",
    coordinates: [48.8606, 2.3376],
    description: "The Louvre Museum in Paris is the world's largest art museum and a historic landmark. Home to masterpieces like the Mona Lisa and Venus de Milo, it spans centuries of art and history—from ancient civilizations to Renaissance masterworks.",
    popularThings: [
      { name: "Mona Lisa", image: "https://images.unsplash.com/photo-1423742774270-6884aac775fa?w=300", description: "Leonardo da Vinci's iconic painting" },
      { name: "Venus de Milo", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300", description: "Ancient Greek sculpture of Aphrodite" },
      { name: "Cour Carrée", image: "https://images.unsplash.com/photo-1549144511-f099e773c147?w=300", description: "Historic courtyard of the old palace" },
      { name: "Winged Victory", image: "https://images.unsplash.com/photo-1591289009723-aef0a1a8a211?w=300", description: "Hellenistic sculpture" },
    ],
  },
  {
    id: "eiffel",
    day: 1,
    title: "Paris Iconic Landmarks",
    name: "Eiffel Tower",
    image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=800",
    rating: 4.9,
    price: "$28.00",
    status: "Open now",
    location: "Paris, France",
    coordinates: [48.8584, 2.2945],
    description: "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris. Named after engineer Gustave Eiffel, it has become a global cultural icon of France.",
    popularThings: [
      { name: "Summit View", image: "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=300", description: "Panoramic city views" },
      { name: "Champagne Bar", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300", description: "Toast at the top" },
    ],
  },
];

// User Avatar component for the map
function UserAvatarOnMap() {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !user) {
    return null;
  }

  const displayName = user.name || user.email?.split("@")[0] || "Traveler";
  const userInitial = displayName[0]?.toUpperCase() || "T";

  return (
    <div className="absolute top-4 right-20 z-[1000]">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-1">
        <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
          {user.image ? (
            <Image
              src={user.image}
              alt={displayName}
              width={56}
              height={56}
              className="rounded-full object-cover"
            />
          ) : (
            <span className="text-white text-lg font-semibold">{userInitial}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentAttachment | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [hasSentPendingMessage, setHasSentPendingMessage] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Function to fetch full document data
  const fetchDocumentData = async (docId: string, basicDoc: DocumentAttachment) => {
    setIsLoadingDocument(true);
    try {
      // Prefer slug over ID for fetching (more reliable)
      const fetchKey = basicDoc.slug || docId;
      console.log("Fetching document with key:", fetchKey);
      
      const response = await fetch(`/api/itinerary/documents/${fetchKey}`);
      if (response.ok) {
        const data = await response.json();
        const doc = data.document;
        
        // Transform the full document data
        const fullDocument: DocumentAttachment = {
          id: doc.id,
          slug: doc.slug || doc.id,
          title: doc.title,
          destination: doc.destination,
          country: doc.country,
          country_flag: doc.country_flag,
          duration: doc.duration,
          description: doc.description,
          travelers: doc.travelers,
          avg_cost: doc.avg_cost,
          cover_image: doc.cover_image,
          days: doc.days?.map((day: { day_number: number; title: string; description?: string; activities?: Array<{ time?: string; title: string; type?: string; location?: string; description?: string; price?: string }> }) => ({
            day_number: day.day_number,
            title: day.title,
            description: day.description,
            activities: day.activities?.map((act) => ({
              time: act.time,
              title: act.title,
              type: act.type,
              location: act.location,
              description: act.description,
              price: act.price,
            })) || []
          })) || [],
        };
        
        setSelectedDocument(fullDocument);
      } else {
        // If fetch fails, use the basic data we have
        setSelectedDocument(basicDoc);
      }
    } catch (error) {
      console.error("Error fetching document:", error);
      setSelectedDocument(basicDoc);
    } finally {
      setIsLoadingDocument(false);
    }
  };

  // Fetch existing conversation on mount
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        // Check for stored conversation ID
        const storedConversationId = localStorage.getItem("currentConversationId");
        
        if (storedConversationId) {
          const response = await fetch(`/api/itinerary/conversations/${storedConversationId}`);
          if (response.ok) {
            const data = await response.json();
            setConversationId(storedConversationId);
            
            // Convert database messages to our Message format
            interface DbAttachment {
              id: string;
              document_id?: string;
              title?: string;
              preview_data?: {
                destination?: string;
                duration?: string;
                days?: number;
                cover_image?: string;
              };
            }
            
            interface DbMessage {
              id: string;
              role: string;
              content: string;
              created_at: string;
              metadata?: { document_id?: string; has_document?: boolean };
              attachments?: DbAttachment[];
            }
            
            const loadedMessages: Message[] = data.messages.map((msg: DbMessage) => {
              // Check for document attachment
              const docAttachment = msg.attachments?.find((a: DbAttachment) => a.document_id);
              
              return {
                id: msg.id,
                role: msg.role as "user" | "assistant",
                content: msg.content,
                timestamp: new Date(msg.created_at),
                document: docAttachment?.document_id ? {
                  id: docAttachment.document_id,
                  slug: docAttachment.document_id, // Use ID as fallback slug
                  title: docAttachment.title || "View Itinerary",
                  destination: docAttachment.preview_data?.destination,
                  duration: docAttachment.preview_data?.duration,
                  days: docAttachment.preview_data?.days,
                  cover_image: docAttachment.preview_data?.cover_image,
                } : undefined,
              };
            });
            
            setMessages(loadedMessages);
          } else {
            // Conversation not found, clear stored ID
            localStorage.removeItem("currentConversationId");
          }
        }
      } catch (error) {
        console.error("Error fetching conversation:", error);
      } finally {
        setIsLoadingConversation(false);
      }
    };

    fetchConversation();
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Use the new itinerary chat API for conversation persistence
      const response = await fetch("/api/itinerary/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          conversationId,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();
      const aiResponse = data.message || data.response || "";
      
      // Update conversation ID if returned and save to localStorage
      if (data.conversationId) {
        if (!conversationId) {
          setConversationId(data.conversationId);
        }
        localStorage.setItem("currentConversationId", data.conversationId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
        document: data.document || undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // If a document was created, show it in the activity panel
      if (data.document) {
        setSelectedDocument(data.document);
        setSelectedActivity(null);
        if (isActivityCollapsed) {
          setIsActivityCollapsed(false);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
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
  }, [isLoading, messages, conversationId, isActivityCollapsed]);

  useEffect(() => {
    if (hasSentPendingMessage) return;
    
    const pendingMessage = sessionStorage.getItem("pendingChatMessage");
    if (pendingMessage) {
      sessionStorage.removeItem("pendingChatMessage");
      setHasSentPendingMessage(true);
      setTimeout(() => {
        sendMessage(pendingMessage);
      }, 100);
    }
  }, [hasSentPendingMessage, sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const tabs = ["Overview", "Activities", "Tickets", "Location", "Review"];

  return (
    <div className="h-screen bg-[#09090b] flex overflow-hidden relative">
      {/* Background Gradients */}
      <div className="fixed top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Left Panel - AI Chat */}
      <motion.div 
        initial={false}
        animate={{ width: isChatCollapsed ? 60 : 400 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex flex-col border-r border-zinc-800/50 bg-[#0e0e10]/80 backdrop-blur-sm relative z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
          {!isChatCollapsed && (
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">Diaspora AI 4.0</span>
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
          <div className={`flex items-center gap-2 ${isChatCollapsed ? 'w-full justify-center' : ''}`}>
            <button 
              type="button" 
              onClick={() => setIsChatCollapsed(!isChatCollapsed)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              title={isChatCollapsed ? "Expand chat" : "Collapse chat"}
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isChatCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
              </svg>
            </button>
            {!isChatCollapsed && (
              <>
                <button 
                  type="button" 
                  onClick={() => {
                    // Start new conversation
                    setMessages([]);
                    setConversationId(null);
                    setSelectedDocument(null);
                    localStorage.removeItem("currentConversationId");
                  }}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                  title="New Chat"
                >
                  <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button type="button" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Collapsed state */}
        {isChatCollapsed && (
          <div className="flex-1 flex flex-col items-center pt-4">
            <Image
              src="/logo.png"
              alt="Diaspora AI"
              width={40}
              height={40}
              className="rounded-xl"
            />
          </div>
        )}

        {/* Messages */}
        {!isChatCollapsed && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Loading state when fetching conversation */}
              {isLoadingConversation && (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-zinc-400 text-sm">Loading conversation...</span>
                  </div>
                </div>
              )}

              {!isLoadingConversation && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <Image
                    src="/logo.png"
                    alt="Diaspora AI"
                    width={80}
                    height={80}
                    className="mb-4 rounded-2xl"
                  />
                  <h3 className="text-xl font-semibold text-white mb-2">Hi, I&apos;m Diaspora AI</h3>
                  <p className="text-zinc-400 text-sm mb-6">Your personal travel assistant. Ask me anything about planning your perfect trip!</p>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {["5-day Paris itinerary", "Best Tokyo restaurants", "Budget tips for Europe", "Beach destinations"].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => sendMessage(suggestion)}
                        className="px-3 py-2 text-xs text-left text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-3 max-w-[90%] ${message.role === "user" ? "flex-row-reverse" : "items-start"}`}>
                    {message.role === "assistant" && (
                      <Image
                        src="/logo.png"
                        alt="Diaspora AI"
                        width={32}
                        height={32}
                        className="rounded-lg flex-shrink-0 w-8 h-8"
                      />
                    )}
                    <div className="flex-1">
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-zinc-800/80 text-zinc-100"
                        }`}
                      >
                        {message.role === "user" ? (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        ) : (
                          <Markdown content={message.content} />
                        )}
                      </div>

                      {/* Document Attachment - styled like the screenshot */}
                      {message.document && (
                        message.document.requiresAuth ? (
                          // Show sign-in prompt for unauthenticated users
                          <motion.a
                            href="/auth/login"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            className="mt-3 flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <span className="text-amber-400 text-sm font-medium">{message.document.title}</span>
                              <div className="text-xs text-zinc-500">Sign in to save this itinerary</div>
                            </div>
                            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </motion.a>
                        ) : (
                          // Show clickable document card
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => {
                              if (message.document) {
                                // If we don't have full days data, fetch it
                                if (!Array.isArray(message.document.days)) {
                                  fetchDocumentData(message.document.id, message.document);
                                } else {
                                  setSelectedDocument(message.document);
                                }
                              }
                              setSelectedActivity(null);
                              if (isActivityCollapsed) {
                                setIsActivityCollapsed(false);
                              }
                            }}
                            className="mt-3 flex items-center gap-3 px-4 py-3 bg-zinc-800/80 border border-zinc-700/50 rounded-xl hover:bg-zinc-700/50 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <span className="text-blue-400 text-sm font-medium">{message.document.title}</span>
                          </motion.button>
                        )
                      )}

                      {message.itineraryCard && !message.document && (
                        <motion.button
                          type="button"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => setSelectedActivity(sampleActivities[0])}
                          className="mt-3 w-full text-left px-4 py-3 bg-blue-600/20 border border-blue-500/30 rounded-xl hover:bg-blue-600/30 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {message.itineraryCard.title}
                          </div>
                        </motion.button>
                      )}

                      {message.role === "assistant" && message.content.includes("budget") && !message.document && (
                        <motion.button
                          type="button"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          onClick={() => sendMessage("make it more budget-friendly")}
                          className="mt-3 px-4 py-2 bg-purple-600/80 text-white text-sm rounded-full hover:bg-purple-600 transition-colors"
                        >
                          make it more budget-friendly
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 items-start">
                  <Image
                    src="/logo.png"
                    alt="Diaspora AI"
                    width={32}
                    height={32}
                    className="rounded-lg flex-shrink-0 w-8 h-8"
                  />
                  <div className="bg-zinc-800/80 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-zinc-800/50">
              <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3 bg-zinc-800/50 rounded-xl">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-zinc-500 focus:outline-none"
                />
                <button type="button" className="text-zinc-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
              <p className="text-xs text-zinc-600 text-center mt-3">Diaspora AImay make errors. Check important information.</p>
            </div>
          </>
        )}
      </motion.div>

      {/* Middle Panel - Activity Details */}
      <motion.div 
        initial={false}
        animate={{ width: isActivityCollapsed ? 60 : 420 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex flex-col border-r border-zinc-800/50 bg-[#0e0e10]/80 backdrop-blur-sm relative z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
          {!isActivityCollapsed && selectedActivity && (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Link href="/itinerary" className="p-1 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0">
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <span className="text-white font-medium text-sm truncate">Day {selectedActivity.day}: {selectedActivity.title}</span>
            </div>
          )}
          {!isActivityCollapsed && selectedDocument && !selectedActivity && (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedDocument(null)}
                className="p-1 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-white font-medium text-sm truncate">{selectedDocument.title}</span>
            </div>
          )}
          {!isActivityCollapsed && !selectedActivity && !selectedDocument && (
            <span className="text-zinc-400 font-medium">Activity Details</span>
          )}
          <div className={`flex items-center gap-2 ${isActivityCollapsed ? 'w-full justify-center' : 'flex-shrink-0'}`}>
            <button 
              type="button" 
              onClick={() => setIsActivityCollapsed(!isActivityCollapsed)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              title={isActivityCollapsed ? "Expand panel" : "Collapse panel"}
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isActivityCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
              </svg>
            </button>
            {!isActivityCollapsed && (selectedActivity || selectedDocument) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedActivity(null);
                  setSelectedDocument(null);
                }}
                className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Collapsed state */}
        {isActivityCollapsed && (
          <div className="flex-1 flex flex-col items-center pt-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
          </div>
        )}

        {/* Expanded content */}
        {!isActivityCollapsed && (
          <AnimatePresence mode="wait">
            {/* Document Preview */}
            {selectedDocument && !selectedActivity && (
              <motion.div
                key={`doc-${selectedDocument.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col flex-1 overflow-hidden"
              >
                {/* Cover Image */}
                {selectedDocument.cover_image && (
                  <div className="relative h-40 mx-4 mt-4 rounded-2xl overflow-hidden flex-shrink-0">
                    <Image
                      src={selectedDocument.cover_image}
                      alt={selectedDocument.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex items-center gap-2 mb-1">
                        {selectedDocument.country_flag && (
                          <span className="text-lg">{selectedDocument.country_flag}</span>
                        )}
                        <span className="text-xs text-zinc-300 bg-black/40 px-2 py-0.5 rounded-full">
                          {selectedDocument.duration}
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold text-white leading-tight">{selectedDocument.title}</h2>
                      <p className="text-zinc-300 text-sm">{selectedDocument.destination}</p>
                    </div>
                  </div>
                )}

                {/* Document Info */}
                <div className="px-4 pt-3 flex-1 overflow-y-auto">
                  {/* Quick Stats */}
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                    {selectedDocument.travelers && (
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs bg-zinc-800/50 px-2.5 py-1.5 rounded-lg">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{selectedDocument.travelers}</span>
                      </div>
                    )}
                    {selectedDocument.avg_cost && (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs bg-emerald-500/10 px-2.5 py-1.5 rounded-lg">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{selectedDocument.avg_cost}</span>
                      </div>
                    )}
                    {Array.isArray(selectedDocument.days) && (
                      <div className="flex items-center gap-1.5 text-blue-400 text-xs bg-blue-500/10 px-2.5 py-1.5 rounded-lg">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{selectedDocument.days.length} days</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {selectedDocument.description && (
                    <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
                      {selectedDocument.description}
                    </p>
                  )}

                  {/* Day-by-Day Summary */}
                  {Array.isArray(selectedDocument.days) && selectedDocument.days.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      <h3 className="text-white font-medium text-sm flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Your Itinerary
                      </h3>
                      {selectedDocument.days.map((day) => (
                        <div key={day.day_number} className="bg-zinc-800/40 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center justify-center">
                              {day.day_number}
                            </span>
                            <h4 className="text-white text-sm font-medium">{day.title}</h4>
                          </div>
                          {day.activities && day.activities.length > 0 && (
                            <div className="ml-8 space-y-1.5">
                              {day.activities.slice(0, 4).map((activity) => (
                                <div key={`${day.day_number}-${activity.time}-${activity.title}`} className="flex items-center gap-2 text-xs">
                                  <span className="text-zinc-500 w-12 flex-shrink-0">{activity.time || '—'}</span>
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    activity.type === 'attraction' ? 'bg-purple-400' :
                                    activity.type === 'restaurant' ? 'bg-orange-400' :
                                    activity.type === 'hotel' ? 'bg-blue-400' :
                                    activity.type === 'transport' ? 'bg-yellow-400' :
                                    'bg-zinc-400'
                                  }`} />
                                  <span className="text-zinc-300 truncate">{activity.title}</span>
                                  {activity.price && (
                                    <span className="text-emerald-400 ml-auto flex-shrink-0">{activity.price}</span>
                                  )}
                                </div>
                              ))}
                              {day.activities.length > 4 && (
                                <div className="text-zinc-500 text-xs pl-5">
                                  +{day.activities.length - 4} more activities
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Fallback when days is just a number or not loaded */
                    <div className="mb-4 p-4 bg-zinc-800/40 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-white font-medium">Itinerary Ready</h3>
                          <p className="text-zinc-400 text-sm">
                            {typeof selectedDocument.days === 'number' 
                              ? `${selectedDocument.days} days of activities planned`
                              : 'Your trip is ready to view'}
                          </p>
                        </div>
                      </div>
                      <p className="text-zinc-500 text-xs">
                        Click "View Full Itinerary" to see your complete day-by-day travel plan with activities, restaurants, and attractions.
                      </p>
                    </div>
                  )}

                  {/* View Full Itinerary Button */}
                  <Link
                    href={`/itinerary/${selectedDocument.slug || selectedDocument.id}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Full Itinerary
                  </Link>
                </div>
              </motion.div>
            )}
            {selectedActivity && !selectedDocument && (
              <motion.div
                key={selectedActivity.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col flex-1 overflow-hidden"
              >
                {/* Image */}
                <div className="relative h-64 mx-4 mt-4 rounded-2xl overflow-hidden flex-shrink-0">
                  <Image
                    src={selectedActivity.image}
                    alt={selectedActivity.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <button type="button" className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex gap-1 items-center">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-white" : "bg-white/40"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button type="button" className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                    <button type="button" className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Activity Info */}
                <div className="px-4 pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white">{selectedActivity.name}</h2>
                      <div className="flex items-center gap-1 mt-1">
                        <svg className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
                          <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
                        </svg>
                        <span className="text-white text-sm font-medium">{selectedActivity.rating}</span>
                        <span className="text-zinc-500 text-sm">/5</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>from <span className="text-blue-400">{selectedActivity.price}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{selectedActivity.status}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{selectedActivity.location}</span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-6 mt-6 border-b border-zinc-800 overflow-x-auto">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === tab
                            ? "text-white border-b-2 border-blue-500"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {activeTab === "Overview" && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        {selectedActivity.description}{" "}
                        <button type="button" className="text-blue-400 hover:underline">Read more</button>
                      </p>

                      <h3 className="text-lg font-semibold text-white mt-6 mb-4">Popular Things</h3>
                      <div className="grid grid-cols-4 gap-3">
                        {selectedActivity.popularThings.map((thing) => (
                          <div key={thing.name} className="group cursor-pointer">
                            <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
                              <Image
                                src={thing.image}
                                alt={thing.name}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            </div>
                            <h4 className="text-white text-xs font-medium truncate">{thing.name}</h4>
                            <p className="text-zinc-500 text-[10px] truncate">{thing.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {!selectedActivity && !selectedDocument && !isLoadingDocument && (
              <div className="flex flex-col items-center justify-center flex-1 text-center px-8">
                <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Activity Selected</h3>
                <p className="text-zinc-500 text-sm">Ask the AI to create an itinerary and click on an activity to view details</p>
              </div>
            )}
            {isLoadingDocument && (
              <div className="flex flex-col items-center justify-center flex-1 text-center px-8">
                <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center mb-4 animate-pulse">
                  <svg className="w-5 h-5 text-zinc-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <p className="text-zinc-500 text-sm">Loading itinerary...</p>
              </div>
            )}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Right Panel - Map */}
      <div className="flex-1 relative z-10">
        {/* Close Button */}
        <Link
          href="/itinerary"
          className="absolute top-4 right-4 z-[1000] w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>

        {/* User Avatar */}
        <UserAvatarOnMap />

        {/* Zoom Controls */}
        <div className="absolute bottom-8 right-4 z-[1000] flex flex-col gap-2">
          <button type="button" className="w-10 h-10 rounded-lg bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-zinc-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/80 backdrop-blur-sm text-white text-sm">
            <button type="button" className="hover:text-zinc-300">−</button>
            <span>120%</span>
            <button type="button" className="hover:text-zinc-300">+</button>
          </div>
        </div>

        {isClient && (
          <MapContainer
            center={selectedActivity?.coordinates || [48.8566, 2.3522]}
            zoom={13}
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapInvalidator dependencies={[isChatCollapsed, isActivityCollapsed]} />
            {selectedActivity && (
              <Marker position={selectedActivity.coordinates} />
            )}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
