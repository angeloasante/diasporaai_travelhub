# TravelHub - Diaspora AI Travel Platform

<div align="center">
  
  **Your AI-Powered Travel Companion for the African Diaspora**
  
  [Live Demo](https://travelhub.diasporaai.dev) · [Main App](https://app.diasporaai.dev) · [Report Bug](https://github.com/angeloasante/diasporaai_travelhub/issues)
</div>

---

## 🌍 Overview

TravelHub is a comprehensive travel management platform designed specifically for the African diaspora. It provides an intuitive dashboard to manage flights, itineraries, and visa applications - all powered by AI assistance.

### Key Features

- **📊 Smart Dashboard** - Real-time overview of upcoming trips, visa progress, and flight bookings
- **✈️ Flight Management** - Search, book, and track flights with support for multiple payment methods (Stripe, Paystack, MoMo)
- **🗺️ AI Itinerary Builder** - Create detailed trip itineraries with AI assistance and interactive maps
- **📋 Visa Application Tracker** - Track visa requirements and application progress
- **🔔 Real-time Updates** - Live updates via Supabase real-time subscriptions
- **💳 Multi-Payment Support** - Stripe for international cards, Paystack/MoMo for African mobile money

---

## 🏗️ Architecture

```
travelhub/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── bookings/      # Booking management
│   │   ├── dashboard/     # Dashboard data aggregation
│   │   ├── itinerary/     # Itinerary CRUD & AI chat
│   │   └── visa/          # Visa application management
│   ├── flights/           # Flight search & booking pages
│   ├── itinerary/         # Itinerary management pages
│   └── visa/              # Visa application pages
├── components/            # React components
│   ├── cards/            # Dashboard bento grid cards
│   ├── flights/          # Flight-related components
│   ├── itinerary/        # Itinerary components & maps
│   ├── sidebar/          # Navigation sidebar
│   └── visa/             # Visa application components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities & configurations
│   ├── auth.ts          # NextAuth.js configuration
│   ├── cache.ts         # Session storage caching
│   └── supabase.ts      # Supabase client
└── public/              # Static assets
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- pnpm (recommended) or npm
- Supabase account
- Main Diaspora AI app running (for shared auth)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/angeloasante/diasporaai_travelhub.git
   cd diasporaai_travelhub
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   # Authentication (MUST match main app)
   AUTH_SECRET=your-auth-secret-from-main-app
   NEXTAUTH_URL=https://travelhub.diasporaai.dev
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Google Maps (for itinerary maps)
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
   
   # OpenAI (for AI itinerary chat)
   OPENAI_API_KEY=your-openai-key
   ```

4. **Run the development server**
   ```bash
   pnpm dev
   ```
   
   The app will be available at `http://localhost:3002`

---

## 🔐 Authentication

TravelHub uses **shared authentication** with the main Diaspora AI app. This is achieved through:

1. **Shared AUTH_SECRET** - Both apps use the same secret for JWT signing
2. **Cross-subdomain cookies** - Session cookies are set on `.diasporaai.dev` domain
3. **Read-only auth** - TravelHub reads sessions but doesn't create them

### How it works:

1. User logs in at `app.diasporaai.dev`
2. Session cookie is set on `.diasporaai.dev` (accessible to all subdomains)
3. TravelHub reads this cookie to authenticate users
4. Unauthenticated users are redirected to the main app's login page

### Domain Configuration

For production, ensure these domains are configured:
- Main app: `app.diasporaai.dev`
- TravelHub: `travelhub.diasporaai.dev`

Both must share the same `AUTH_SECRET` environment variable.

---

## 📦 Database Schema

TravelHub uses Supabase with the following main tables:

### `itinerary_documents`
Stores user itineraries with metadata
```sql
- id (uuid, primary key)
- user_id (text, references auth users)
- slug (text, unique)
- title (text)
- destination (text)
- country (text)
- dates (text)
- cover_image (text)
- status (text)
```

### `itinerary_days`
Days within an itinerary
```sql
- id (uuid, primary key)
- document_id (uuid, references itinerary_documents)
- day_number (integer)
- date (text)
- title (text)
```

### `itinerary_activities`
Activities within each day
```sql
- id (uuid, primary key)
- day_id (uuid, references itinerary_days)
- title (text)
- type (text: flight, hotel, restaurant, attraction, transport)
- location (text)
- latitude (float)
- longitude (float)
- time (text)
- price (text)
```

### `visa_applications`
Visa application tracking
```sql
- id (uuid, primary key)
- user_id (text)
- destination_country (text)
- visa_type (text)
- status (text: draft, submitted, processing, approved, denied)
- requirements (jsonb)
```

### `booking` (Main app database)
Flight bookings are stored in the main app's PostgreSQL database and accessed via API.

---

## 🎨 Components

### Dashboard Cards
- `UpcomingTripCard` - Shows next planned trip with destination image
- `VisaProgressCard` - Displays visa application progress
- `CountdownCard` - Days until next trip
- `FlightInfoCard` - Upcoming flight details
- `PriceTrendsChart` - Flight price trends (in development)

### Core Components
- `Sidebar` - Navigation with Contact Support, Main AI Chat link
- `BookingDetail` - Detailed flight booking view with boarding pass
- `ItineraryDetail` - Interactive itinerary with map and AI chat
- `VisaOperations` - Visa application management

---

## ⚡ Performance Optimizations

TravelHub implements several caching strategies:

### Client-Side Caching
- **SessionStorage cache** - 5-10 minute cache for dashboard and detail pages
- **Instant navigation** - Cached data shown immediately on revisit

### Server-Side Caching
- **HTTP Cache-Control headers** - `max-age=300, stale-while-revalidate=600`
- **Next.js revalidation** - Pages revalidate every 5 minutes

### Loading States
- **Skeleton loaders** - Instant visual feedback while data loads
- **Optimistic updates** - UI updates before server confirmation

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH_SECRET` | NextAuth secret (must match main app) | ✅ |
| `NEXTAUTH_URL` | Full URL of TravelHub | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for AI chat | ✅ |

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Configure domain: `travelhub.diasporaai.dev`
5. Deploy

### Environment Setup for Production

```env
# Production URLs
NEXTAUTH_URL=https://travelhub.diasporaai.dev

# Auth (MUST match main app exactly)
AUTH_SECRET=same-as-main-app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key

# OpenAI
OPENAI_API_KEY=your-key
```

### Domain Setup

1. Add `travelhub.diasporaai.dev` to your Vercel project
2. Configure DNS: CNAME record pointing to Vercel
3. Ensure SSL is enabled (automatic with Vercel)

---

## 📱 Features Roadmap

### ✅ Completed
- [x] Dashboard with real-time data
- [x] Flight booking detail pages
- [x] AI itinerary builder with maps
- [x] Visa application tracking
- [x] Session caching for performance
- [x] Contact Support (WhatsApp/Email)

### 🚧 In Development
- [ ] Flight price trends analytics
- [ ] Push notifications
- [ ] Offline support (PWA)

### 📋 Planned
- [ ] Group trip planning
- [ ] Expense tracking
- [ ] Travel insurance integration
- [ ] Loyalty/miles tracking

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Vercel](https://vercel.com/) - Deployment platform
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [Google Maps](https://developers.google.com/maps) - Maps & Geocoding

---

<div align="center">
  <strong>Built with ❤️ for the African Diaspora</strong>
  <br />
  <a href="https://diasporaai.dev">Diaspora AI</a>
</div>

