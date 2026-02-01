import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// System prompt for travel assistant
const SYSTEM_PROMPT = `You are Diaspora AI, a friendly and knowledgeable travel assistant. You help users plan their trips, create itineraries, and provide travel recommendations.

When creating itineraries, format them as clear bullet points with days, activities, and times. Be concise but helpful.

You can:
- Create detailed travel itineraries
- Suggest budget-friendly or luxury options
- Recommend restaurants, hotels, and attractions
- Provide local tips and cultural insights
- Help modify existing travel plans

Always be enthusiastic about travel and provide practical, actionable advice. If a user asks about a destination, include specific recommendations with estimated costs when possible.

When suggesting an itinerary, you can generate a clickable card for it by responding with a special format:
[ITINERARY_CARD: title="5-day Itinerary for Paris" | destination="Paris, France" | days=5 | budget="budget-friendly"]

Keep responses conversational and engaging. Use emojis sparingly to add personality.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, messages, itineraryContext } = body;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    // Build context from current itinerary if provided
    let contextPrompt = SYSTEM_PROMPT;
    if (itineraryContext) {
      contextPrompt += `\n\nCurrent itinerary context:
- Destination: ${itineraryContext.destination}
- Duration: ${itineraryContext.duration}
- Current day: Day ${itineraryContext.currentDay}
- Activities: ${itineraryContext.activities?.join(", ")}

Use this context to provide relevant suggestions and modifications.`;
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: contextPrompt,
    });

    // Handle both formats: { message, history } or { messages }
    let chatHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    let userMessage: string;

    if (message && history) {
      // New format: message + history
      chatHistory = (history || []).map((msg: { role: string; content: string }) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));
      userMessage = message;
    } else if (messages && messages.length > 0) {
      // Old format: messages array
      chatHistory = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));
      userMessage = messages[messages.length - 1].content;
    } else {
      return NextResponse.json(
        { error: "No message provided" },
        { status: 400 }
      );
    }

    // Start chat with history
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    });
    
    // Send message and get response
    const result = await chat.sendMessage(userMessage);
    const response = result.response.text();

    // Parse for itinerary cards
    const itineraryCardMatch = response.match(/\[ITINERARY_CARD:([^\]]+)\]/);
    let itineraryCard = null;
    let cleanResponse = response;

    if (itineraryCardMatch) {
      const cardParams = itineraryCardMatch[1];
      const titleMatch = cardParams.match(/title="([^"]+)"/);
      const destinationMatch = cardParams.match(/destination="([^"]+)"/);
      const daysMatch = cardParams.match(/days=(\d+)/);
      const budgetMatch = cardParams.match(/budget="([^"]+)"/);

      if (titleMatch) {
        itineraryCard = {
          title: titleMatch[1],
          destination: destinationMatch?.[1] || "",
          days: parseInt(daysMatch?.[1] || "5", 10),
          budget: budgetMatch?.[1] || "moderate",
        };
      }

      cleanResponse = response.replace(/\[ITINERARY_CARD:[^\]]+\]/g, "").trim();
    }

    return NextResponse.json({
      message: cleanResponse,
      itineraryCard,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
