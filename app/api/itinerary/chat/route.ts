import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, FunctionCallingMode, type Tool } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import {
  getOrCreateConversation,
  addMessage,
  createDocument,
  addAttachment,
  updateConversation,
} from "@/lib/itinerary-chat";
import { enrichItinerary } from "@/lib/google-places";
import type { CreateDocumentInput } from "@/types/itinerary-chat";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Keywords that indicate user wants an itinerary created
const ITINERARY_KEYWORDS = [
  "itinerary", "plan", "trip", "travel", "days", "day trip",
  "make me", "create", "build", "generate", "suggest",
  "party", "visit", "explore", "adventure", "vacation", "holiday"
];

// System prompt - no longer needs JSON instructions
const SYSTEM_PROMPT = `You are Diaspora AI, a friendly and knowledgeable travel assistant. You help users plan their trips, create itineraries, and provide travel recommendations.

When creating itineraries, be ENTHUSIASTIC and DETAILED! Your response should:
1. Start with an exciting introduction about the destination
2. Highlight key experiences they'll have
3. Mention the vibe/atmosphere of the place
4. List out the daily itinerary with times, activities, and prices
5. Include insider tips and cultural insights
6. End with excitement about their upcoming trip

Format your response with:
- Engaging introduction paragraph about the destination
- Day-by-day breakdown with bullet points
- Estimated costs for activities
- Local tips and recommendations
- A warm sign-off

You can:
- Create detailed travel itineraries
- Suggest budget-friendly or luxury options  
- Recommend restaurants, hotels, and attractions
- Provide local tips and cultural insights
- Help modify existing travel plans

⚠️⚠️⚠️ CRITICAL FLIGHT BOOKING RULES - READ CAREFULLY ⚠️⚠️⚠️
YOU MUST NEVER, UNDER ANY CIRCUMSTANCES:
- Recommend third-party OTAs (Online Travel Agencies) like Expedia, Kayak, Skyscanner, Google Flights, Booking.com, or any other flight booking websites
- Suggest users search for flights elsewhere
- Provide links to external flight booking platforms
- Tell users to "compare prices" on other sites

INSTEAD, YOU MUST ALWAYS:
- Tell users that WE CAN BOOK FLIGHTS directly through Diaspora AI
- Direct them to our main chat at app.diasporaai.dev for flight booking
- Say something like: "For flight bookings, head over to our main AI chat at app.diasporaai.dev - we can search and book your flights directly with competitive prices!"
- If they ask about flights in itineraries, include flight info but remind them to use app.diasporaai.dev to book

Example responses when users ask about flights:
✅ "Great choice! For booking your flight to Paris, visit our main chat at app.diasporaai.dev - we'll handle everything for you with great rates!"
✅ "I've included flight details in your itinerary. When you're ready to book, hop over to app.diasporaai.dev and our AI will get you the best deals!"
❌ NEVER: "You can find flights on Skyscanner or Google Flights"
❌ NEVER: "Check Expedia for the best deals"
⚠️⚠️⚠️ END FLIGHT BOOKING RULES ⚠️⚠️⚠️

CRITICAL INSTRUCTION - ALWAYS SAVE ITINERARIES:
When a user asks you to create, make, plan, build, or generate ANY itinerary (even casual requests like "i wanna party" or "plan my trip"), you MUST:
1. First respond with your detailed, exciting itinerary text
2. ALWAYS call the create_itinerary_document function to save it - this is mandatory!

Even for multi-city trips, create ONE document with ALL days. For example:
- "Johannesburg to Ghana to London" = single document with days 1-12 covering all destinations
- Each city becomes a section with sequential day numbers

For activity types, use: "flight", "hotel", "restaurant", "attraction", "transport", or "other"

For location field in activities, use SPECIFIC place names that can be found on Google Maps:
- Good: "Apartheid Museum, Johannesburg", "Gold Reef City", "Maboneng Precinct"
- Bad: "Museum", "Local restaurant", "City center"

Be enthusiastic! Use emojis appropriately (but not excessively). Make the user EXCITED about their trip!

REMEMBER: If you describe an itinerary in your response, you MUST call create_itinerary_document to save it!`;

// Define the function that the AI can call
const tools = [
  {
    functionDeclarations: [
      {
        name: "create_itinerary_document",
        description: "Creates and saves a complete travel itinerary document. Call this function whenever you create or modify an itinerary for the user.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            title: {
              type: SchemaType.STRING,
              description: "The title of the itinerary, e.g., '5-day Paris Itinerary'"
            },
            destination: {
              type: SchemaType.STRING,
              description: "The destination city and country, e.g., 'Paris, France'"
            },
            country: {
              type: SchemaType.STRING,
              description: "The country name, e.g., 'France'"
            },
            country_flag: {
              type: SchemaType.STRING,
              description: "The country flag emoji, e.g., '🇫🇷'"
            },
            duration: {
              type: SchemaType.STRING,
              description: "Trip duration, e.g., '5 Days Trip'"
            },
            description: {
              type: SchemaType.STRING,
              description: "A brief description of the trip"
            },
            avg_cost: {
              type: SchemaType.STRING,
              description: "Average cost estimate, e.g., '$2,000 Avg.'"
            },
            travelers: {
              type: SchemaType.STRING,
              description: "Number of travelers, e.g., '2 Adults'"
            },
            cover_image: {
              type: SchemaType.STRING,
              description: "URL for a cover image of the destination"
            },
            days: {
              type: SchemaType.ARRAY,
              description: "Array of day objects with activities",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  day_number: {
                    type: SchemaType.NUMBER,
                    description: "The day number (1, 2, 3, etc.)"
                  },
                  title: {
                    type: SchemaType.STRING,
                    description: "Title for the day, e.g., 'Arrival & Eiffel Tower'"
                  },
                  activities: {
                    type: SchemaType.ARRAY,
                    description: "Array of activities for this day",
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        time: {
                          type: SchemaType.STRING,
                          description: "Time of activity, e.g., '10:00 AM'"
                        },
                        title: {
                          type: SchemaType.STRING,
                          description: "Activity title - this should be a descriptive name like 'Visit the Apartheid Museum' or 'Lunch at The Butcher Shop'"
                        },
                        type: {
                          type: SchemaType.STRING,
                          description: "Type: flight, hotel, restaurant, attraction, transport, or other"
                        },
                        location: {
                          type: SchemaType.STRING,
                          description: "Place name (NOT street address). Use the establishment name like 'Apartheid Museum', 'Gold Reef City', 'The Saxon Hotel', 'Turbine Hall'. For neighborhoods, use just the name like 'Soweto' or 'Maboneng'."
                        },
                        price: {
                          type: SchemaType.STRING,
                          description: "Price estimate, e.g., '$20'"
                        },
                        action_label: {
                          type: SchemaType.STRING,
                          description: "Button label, e.g., 'Book Tickets'"
                        }
                      },
                      required: ["time", "title", "type", "location"]
                    }
                  }
                },
                required: ["day_number", "title", "activities"]
              }
            }
          },
          required: ["title", "destination", "country", "duration", "days"]
        }
      }
    ]
  }
];

// Destination cover images mapping
const destinationImages: Record<string, string> = {
  // Europe
  paris: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800",
  london: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800",
  rome: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800",
  barcelona: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800",
  amsterdam: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800",
  lisbon: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800",
  prague: "https://images.unsplash.com/photo-1541849546-216549ae216d?w=800",
  // Asia
  tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800",
  singapore: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800",
  bangkok: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800",
  bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800",
  seoul: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800",
  // Americas
  new_york: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800",
  los_angeles: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800",
  miami: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800",
  rio_de_janeiro: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800",
  mexico_city: "https://images.unsplash.com/photo-1518659526054-e268a2e4e2cf?w=800",
  // Middle East
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
  istanbul: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800",
  marrakech: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800",
  // Africa
  johannesburg: "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=800",
  cape_town: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800",
  lagos: "https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?w=800",
  accra: "https://images.unsplash.com/photo-1594398028856-f6be8d086d01?w=800",
  nairobi: "https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800",
  cairo: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800",
  casablanca: "https://images.unsplash.com/photo-1569383746724-6f1b882b8f46?w=800",
  dar_es_salaam: "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800",
  kigali: "https://images.unsplash.com/photo-1580746738099-78d6833b3e86?w=800",
  addis_ababa: "https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=800",
  zanzibar: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800",
  victoria_falls: "https://images.unsplash.com/photo-1534759926787-89fa60f35848?w=800",
  // Oceania
  sydney: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800",
  melbourne: "https://images.unsplash.com/photo-1514395462725-fb4566210144?w=800",
  // Default
  default: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800"
};

function getCoverImage(destination: string): string {
  const key = destination.toLowerCase().split(",")[0].trim().replace(/\s+/g, "_");
  return destinationImages[key] || destinationImages.default;
}

// POST /api/itinerary/chat - Send a message and get AI response
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const body = await req.json();
    const { message, conversationId, history } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    // Get or create conversation if user is authenticated
    let conversation = null;
    let currentConversationId = conversationId;

    if (userId) {
      conversation = await getOrCreateConversation(userId, conversationId);
      currentConversationId = conversation.id;

      // Save user message to database
      await addMessage(currentConversationId, "user", message);
    }

    // Build chat history for AI
    const chatHistory = (history || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Check if the message suggests the user wants an itinerary
    const messageLower = message.toLowerCase();
    const wantsItinerary = ITINERARY_KEYWORDS.some(keyword => messageLower.includes(keyword));
    
    console.log("=== Itinerary Chat API ===");
    console.log("User message:", message);
    console.log("Wants itinerary:", wantsItinerary);
    console.log("User authenticated:", !!userId);

    // Initialize the model with function calling
    // Use ANY mode when user wants an itinerary to FORCE function calling
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
      tools: tools as Tool[],
      toolConfig: wantsItinerary ? {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY,
          allowedFunctionNames: ["create_itinerary_document"],
        },
      } : {
        functionCallingConfig: {
          mode: FunctionCallingMode.AUTO,
        },
      },
    });

    // Start chat with history
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 8192, // Increased for longer itineraries
        temperature: 0.7,
      },
    });

    // Send message and get response
    let result = await chat.sendMessage(message);
    let response = result.response;
    
    let documentAttachment = null;
    let finalTextResponse = "";

    // Check if the model wants to call a function
    const functionCalls = response.functionCalls();
    
    // Debug logging
    console.log("Function calls received:", functionCalls?.length || 0);
    if (functionCalls && functionCalls.length > 0) {
      console.log("Function names:", functionCalls.map(fc => fc.name));
    }
    
    if (functionCalls && functionCalls.length > 0) {
      // Collect all function responses - Gemini requires we respond to ALL function calls
      const functionResponses: Array<{ functionResponse: { name: string; response: Record<string, unknown> } }> = [];
      
      // Only process the FIRST create_itinerary_document call (ignore duplicates)
      const firstDocumentCall = functionCalls.find(fc => fc.name === "create_itinerary_document");
      
      if (firstDocumentCall) {
        const args = firstDocumentCall.args as CreateDocumentInput & {
          country_flag?: string;
          avg_cost?: string;
          travelers?: string;
          cover_image?: string;
        };
        
        // Create the document if user is authenticated
        if (userId && currentConversationId) {
          try {
            // Always use our curated cover images, ignore AI-provided ones
            const coverImage = getCoverImage(args.destination);
            
            console.log(`Enriching itinerary for ${args.destination} with Google Places data...`);
            
            // Enrich all activities with Google Places data (real photos, ratings, booking links)
            const enrichedDays = await enrichItinerary(
              args.days.map((day, idx) => ({
                day_number: day.day_number || idx + 1,
                date: `Day ${day.day_number || idx + 1}`,
                title: day.title,
                description: day.description,
                activities: day.activities?.map(act => ({
                  title: act.title,
                  type: act.type,
                  location: act.location,
                  description: act.description,
                  time: act.time,
                  price: act.price,
                  action_label: act.action_label,
                })),
              })),
              args.destination
            );
            
            console.log(`Enrichment complete. Creating document...`);
            
            const document = await createDocument(userId, {
              conversation_id: currentConversationId,
              title: args.title,
              destination: args.destination,
              country: args.country,
              country_flag: args.country_flag,
              duration: args.duration,
              description: args.description,
              dates: "Flexible",
              travelers: args.travelers || "2 Adults",
              avg_cost: args.avg_cost,
              cover_image: coverImage,
              days: enrichedDays,
            });

            // Update conversation
            await updateConversation(currentConversationId, {
              destination: args.destination,
              duration: args.duration,
              status: "completed",
            });

            documentAttachment = {
              id: document.id,
              slug: document.slug,
              title: args.title,
              destination: args.destination,
              country: args.country,
              country_flag: args.country_flag,
              duration: args.duration,
              description: args.description,
              travelers: args.travelers || "2 Adults",
              avg_cost: args.avg_cost,
              days: enrichedDays.map((day, idx) => ({
                day_number: day.day_number || idx + 1,
                title: day.title,
                description: day.description,
                activities: day.activities?.map(act => ({
                  time: act.time,
                  title: act.title,
                  type: act.type,
                  location: act.location,
                  description: act.editorialSummary || act.description,
                  price: act.price,
                  image: act.image,
                  rating: act.rating,
                  userRatingsTotal: act.userRatingsTotal,
                  booking_url: act.booking_url,
                  action_label: act.action_label,
                })) || []
              })),
              cover_image: coverImage,
            };

            // Add success response for each function call (Gemini requires matching responses)
            for (const fc of functionCalls) {
              if (fc.name === "create_itinerary_document") {
                functionResponses.push({
                  functionResponse: {
                    name: "create_itinerary_document",
                    response: {
                      success: true,
                      document_id: document.id,
                      message: `Itinerary "${args.title}" has been created and saved successfully with real photos and booking links!`
                    }
                  }
                });
              }
            }
          } catch (docError) {
            console.error("Error creating document:", docError);
            
            // Add error response for each function call
            for (const fc of functionCalls) {
              if (fc.name === "create_itinerary_document") {
                functionResponses.push({
                  functionResponse: {
                    name: "create_itinerary_document",
                    response: {
                      success: false,
                      error: "Failed to save the itinerary document"
                    }
                  }
                });
              }
            }
          }
        } else {
          // User not authenticated - create a preview document attachment
          // so the frontend can show a card with "Sign in to save" prompt
          console.log("User not authenticated - creating preview document attachment");
          
          const coverImage = getCoverImage(args.destination);
          
          // Create a preview attachment (not saved to DB)
          documentAttachment = {
            id: `preview-${Date.now()}`,
            slug: null, // No slug since not saved
            title: args.title,
            destination: args.destination,
            country: args.country,
            country_flag: args.country_flag,
            duration: args.duration,
            description: args.description,
            travelers: args.travelers || "2 Adults",
            avg_cost: args.avg_cost,
            days: args.days?.length || 0,
            cover_image: coverImage,
            requiresAuth: true, // Flag to show sign-in prompt
          };
          
          // Add response for each function call (unauthenticated)
          for (const fc of functionCalls) {
            if (fc.name === "create_itinerary_document") {
              functionResponses.push({
                functionResponse: {
                  name: "create_itinerary_document",
                  response: {
                    success: false,
                    error: "Please sign in to save your itinerary. The itinerary details are shown above."
                  }
                }
              });
            }
          }
        }
      }
      
      // Send all function responses at once (Gemini requires this)
      if (functionResponses.length > 0) {
        try {
          result = await chat.sendMessage(functionResponses);
          response = result.response;
        } catch (responseError) {
          console.error("Error sending function responses:", responseError);
          // Continue without the AI's follow-up response
        }
      }
    }

    // Get the final text response - handle potential empty responses
    try {
      finalTextResponse = response.text() || "";
    } catch (textError) {
      console.error("Error getting text response:", textError);
      finalTextResponse = "";
    }
    
    // If document was created but no text response, provide a success message
    if (!finalTextResponse && documentAttachment) {
      finalTextResponse = `🎉 I've created your itinerary "${documentAttachment.title}"! Click the card below to view the full details with all your activities, locations, and travel tips. Have an amazing trip!`;
    }
    
    // If no text response and no document was created, provide a fallback
    if (!finalTextResponse && !documentAttachment) {
      finalTextResponse = "I'm here to help you plan your trip! Tell me about your dream destination or what kind of experience you're looking for.";
    }

    // Save AI response
    if (userId && currentConversationId) {
      const aiMessage = await addMessage(
        currentConversationId,
        "assistant",
        finalTextResponse,
        documentAttachment ? { has_document: true, document_id: documentAttachment.id } : {}
      );

      // Create attachment if document was created
      if (documentAttachment) {
        await addAttachment(aiMessage.id, documentAttachment.id, documentAttachment.title, {
          destination: documentAttachment.destination,
          duration: documentAttachment.duration,
          days: Array.isArray(documentAttachment.days) ? documentAttachment.days.length : documentAttachment.days,
          cover_image: documentAttachment.cover_image,
        });
      }
    }

    return NextResponse.json({
      message: finalTextResponse,
      conversationId: currentConversationId,
      document: documentAttachment,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
