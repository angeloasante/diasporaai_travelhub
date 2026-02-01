-- ============================================
-- ITINERARY DATABASE SCHEMA
-- Run this script in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ITINERARIES TABLE (Main itinerary info)
-- ============================================
CREATE TABLE IF NOT EXISTS itinerary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE, -- URL-friendly identifier like "rome-getaway"
  description TEXT,
  duration VARCHAR(100), -- e.g., "5 Days Trip"
  
  -- Location Info
  country VARCHAR(100),
  country_code VARCHAR(10), -- ISO country code
  country_flag VARCHAR(10), -- Emoji flag like "🇮🇹"
  city VARCHAR(100),
  
  -- Trip Details
  start_date DATE,
  end_date DATE,
  dates_display VARCHAR(100), -- Display format like "Oct 12-16"
  travelers VARCHAR(100), -- e.g., "2 Adults"
  travelers_count INTEGER DEFAULT 1,
  
  -- Cost Info
  total_cost DECIMAL(10, 2),
  avg_cost_display VARCHAR(50), -- Display format like "$1,200.00 Avg."
  currency VARCHAR(10) DEFAULT 'USD',
  
  -- Status & Visibility
  status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
  is_public BOOLEAN DEFAULT false,
  is_ai_generated BOOLEAN DEFAULT false,
  
  -- Cover Image
  cover_image_url TEXT,
  
  -- Metadata
  tags TEXT[], -- Array of tags for categorization
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ITINERARY DAYS TABLE (Day-by-day breakdown)
-- ============================================
CREATE TABLE IF NOT EXISTS itinerary_day (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  itinerary_id UUID NOT NULL REFERENCES itinerary(id) ON DELETE CASCADE,
  
  -- Day Info
  day_number INTEGER NOT NULL,
  date DATE,
  date_display VARCHAR(50), -- e.g., "October 12"
  title VARCHAR(255), -- e.g., "Arrival & Exploration"
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique day numbers per itinerary
  UNIQUE(itinerary_id, day_number)
);

-- ============================================
-- 3. ACTIVITIES TABLE (Individual activities)
-- ============================================
CREATE TABLE IF NOT EXISTS itinerary_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID NOT NULL REFERENCES itinerary_day(id) ON DELETE CASCADE,
  itinerary_id UUID NOT NULL REFERENCES itinerary(id) ON DELETE CASCADE,
  
  -- Activity Info
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- flight, hotel, restaurant, attraction, transport
  time VARCHAR(20), -- e.g., "10:30 AM"
  time_start TIME,
  time_end TIME,
  duration_minutes INTEGER,
  
  -- Location
  location VARCHAR(255),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Cost
  price DECIMAL(10, 2),
  price_display VARCHAR(50), -- e.g., "$130.00"
  price_note VARCHAR(100), -- e.g., "per night", "per person"
  is_included BOOLEAN DEFAULT false, -- If included in package
  
  -- Media
  image_url TEXT,
  
  -- Booking Info
  action_label VARCHAR(100), -- e.g., "Book a Flight", "Reserve Table"
  booking_url TEXT,
  booking_reference VARCHAR(100),
  is_booked BOOLEAN DEFAULT false,
  
  -- Additional Details
  notes TEXT,
  confirmation_number VARCHAR(100),
  
  -- Order within the day
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_itinerary_user_id ON itinerary(user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_slug ON itinerary(slug);
CREATE INDEX IF NOT EXISTS idx_itinerary_status ON itinerary(status);
CREATE INDEX IF NOT EXISTS idx_itinerary_start_date ON itinerary(start_date);
CREATE INDEX IF NOT EXISTS idx_itinerary_day_itinerary_id ON itinerary_day(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_activity_day_id ON itinerary_activity(day_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_activity_itinerary_id ON itinerary_activity(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_activity_type ON itinerary_activity(type);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE itinerary ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_activity ENABLE ROW LEVEL SECURITY;

-- Itinerary Policies
CREATE POLICY "Users can view their own itineraries" ON itinerary
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own itineraries" ON itinerary
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own itineraries" ON itinerary
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own itineraries" ON itinerary
  FOR DELETE USING (auth.uid() = user_id);

-- Itinerary Day Policies
CREATE POLICY "Users can view days of their itineraries" ON itinerary_day
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM itinerary 
      WHERE itinerary.id = itinerary_day.itinerary_id 
      AND (itinerary.user_id = auth.uid() OR itinerary.is_public = true)
    )
  );

CREATE POLICY "Users can manage days of their itineraries" ON itinerary_day
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM itinerary 
      WHERE itinerary.id = itinerary_day.itinerary_id 
      AND itinerary.user_id = auth.uid()
    )
  );

-- Activity Policies
CREATE POLICY "Users can view activities of their itineraries" ON itinerary_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM itinerary 
      WHERE itinerary.id = itinerary_activity.itinerary_id 
      AND (itinerary.user_id = auth.uid() OR itinerary.is_public = true)
    )
  );

CREATE POLICY "Users can manage activities of their itineraries" ON itinerary_activity
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM itinerary 
      WHERE itinerary.id = itinerary_activity.itinerary_id 
      AND itinerary.user_id = auth.uid()
    )
  );

-- ============================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_itinerary_updated_at
  BEFORE UPDATE ON itinerary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itinerary_day_updated_at
  BEFORE UPDATE ON itinerary_day
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itinerary_activity_updated_at
  BEFORE UPDATE ON itinerary_activity
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_itinerary_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = LOWER(REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_slug_before_insert
  BEFORE INSERT ON itinerary
  FOR EACH ROW EXECUTE FUNCTION generate_itinerary_slug();

-- ============================================
-- 7. SAMPLE DATA (Rome Getaway)
-- ============================================

-- Insert sample itinerary (for testing - uses a fixed UUID for demo)
INSERT INTO itinerary (
  id, title, slug, description, duration, country, country_code, country_flag, city,
  start_date, end_date, dates_display, travelers, travelers_count,
  total_cost, avg_cost_display, currency, status, is_public, is_ai_generated,
  cover_image_url, tags
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Rome Getaway',
  'rome-getaway',
  'A 5-day escape through Rome''s timeless landmarks, local cuisine, and hidden gems — from the Colosseum to charming Trastevere.',
  '5 Days Trip',
  'Italy',
  'IT',
  '🇮🇹',
  'Rome',
  '2026-10-12',
  '2026-10-16',
  'Oct 12-16',
  '2 Adults',
  2,
  1200.00,
  '$1,200.00 Avg.',
  'USD',
  'published',
  true,
  true,
  'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=800&auto=format&fit=crop',
  ARRAY['europe', 'italy', 'culture', 'food', 'history']
) ON CONFLICT (id) DO NOTHING;

-- Insert Day 1
INSERT INTO itinerary_day (id, itinerary_id, day_number, date, date_display, title, description)
VALUES (
  'd1000001-0001-0001-0001-000000000001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  1,
  '2026-10-12',
  'October 12',
  'Arrival & Exploration',
  'Arrive in Rome, check into your hotel, and explore the historic center.'
) ON CONFLICT DO NOTHING;

-- Insert Day 2
INSERT INTO itinerary_day (id, itinerary_id, day_number, date, date_display, title, description)
VALUES (
  'd2000002-0001-0001-0001-000000000002',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  2,
  '2026-10-13',
  'October 13',
  'Vatican & Art',
  'Full day exploring Vatican City and its world-renowned art collections.'
) ON CONFLICT DO NOTHING;

-- Insert Day 3
INSERT INTO itinerary_day (id, itinerary_id, day_number, date, date_display, title, description)
VALUES (
  'd3000003-0001-0001-0001-000000000003',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  3,
  '2026-10-14',
  'October 14',
  'Historic Center',
  'Discover the heart of Rome with its famous fountains and piazzas.'
) ON CONFLICT DO NOTHING;

-- Day 1 Activities
INSERT INTO itinerary_activity (
  day_id, itinerary_id, title, type, time, location, latitude, longitude,
  price, price_display, price_note, is_included, image_url, action_label, sort_order
) VALUES 
(
  'd1000001-0001-0001-0001-000000000001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Fiumicino Airport (Arrival)',
  'flight',
  '10:30 AM',
  'Leonardo da Vinci Intl. Airport',
  41.8003,
  12.2389,
  NULL,
  NULL,
  'Included in Flight Ticket',
  true,
  'https://images.unsplash.com/photo-1529074963764-98f45c47344b?q=80&w=300&auto=format&fit=crop',
  'Book a Flight',
  1
),
(
  'd1000001-0001-0001-0001-000000000001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Albergo Roma (Hotel Check-in)',
  'hotel',
  '12:00 PM',
  'City Center, Rome',
  41.8967,
  12.4822,
  130.00,
  '$130.00',
  'per night',
  false,
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=300&auto=format&fit=crop',
  'View Booking',
  2
),
(
  'd1000001-0001-0001-0001-000000000001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Trattoria da Enzo al 29 (Lunch)',
  'restaurant',
  '1:00 PM',
  'Trastevere, Rome',
  41.8892,
  12.4695,
  27.00,
  '$27.00',
  'per person',
  false,
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=300&auto=format&fit=crop',
  'Reserve Table',
  3
),
(
  'd1000001-0001-0001-0001-000000000001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Colosseum & Roman Forum',
  'attraction',
  '3:00 PM',
  'Piazza del Colosseo, Rome',
  41.8902,
  12.4922,
  20.00,
  '$20.00',
  'per ticket',
  false,
  'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=300&auto=format&fit=crop',
  'Book Ticket',
  4
),
(
  'd1000001-0001-0001-0001-000000000001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Dinner at Roscioli',
  'restaurant',
  '7:30 PM',
  'Via dei Giubbonari, Rome',
  41.8955,
  12.4749,
  45.00,
  '$45.00',
  'per person',
  false,
  'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=300&auto=format&fit=crop',
  'Reserve Table',
  5
);

-- Day 2 Activities
INSERT INTO itinerary_activity (
  day_id, itinerary_id, title, type, time, location, latitude, longitude,
  price, price_display, price_note, is_included, image_url, action_label, sort_order
) VALUES 
(
  'd2000002-0001-0001-0001-000000000002',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Breakfast at Hotel',
  'restaurant',
  '8:00 AM',
  'Albergo Roma',
  41.8967,
  12.4822,
  NULL,
  NULL,
  'Included',
  true,
  'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=300&auto=format&fit=crop',
  'View Details',
  1
),
(
  'd2000002-0001-0001-0001-000000000002',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Vatican Museums & Sistine Chapel',
  'attraction',
  '9:30 AM',
  'Vatican City',
  41.9065,
  12.4536,
  35.00,
  '$35.00',
  'per ticket',
  false,
  'https://images.unsplash.com/photo-1531572753322-ad063cecc140?q=80&w=300&auto=format&fit=crop',
  'Book Ticket',
  2
),
(
  'd2000002-0001-0001-0001-000000000002',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'St. Peter''s Basilica',
  'attraction',
  '1:00 PM',
  'Vatican City',
  41.9022,
  12.4539,
  NULL,
  NULL,
  'Free Entry',
  true,
  'https://images.unsplash.com/photo-1568797629192-789acf8e4df3?q=80&w=300&auto=format&fit=crop',
  'View Info',
  3
);

-- Day 3 Activities
INSERT INTO itinerary_activity (
  day_id, itinerary_id, title, type, time, location, latitude, longitude,
  price, price_display, price_note, is_included, image_url, action_label, sort_order
) VALUES 
(
  'd3000003-0001-0001-0001-000000000003',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Trevi Fountain',
  'attraction',
  '10:00 AM',
  'Piazza di Trevi, Rome',
  41.9009,
  12.4833,
  NULL,
  NULL,
  'Free',
  true,
  'https://images.unsplash.com/photo-1525874684015-58379d421a52?q=80&w=300&auto=format&fit=crop',
  'View Info',
  1
),
(
  'd3000003-0001-0001-0001-000000000003',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Pantheon',
  'attraction',
  '12:00 PM',
  'Piazza della Rotonda, Rome',
  41.8986,
  12.4769,
  5.00,
  '$5.00',
  'per ticket',
  false,
  'https://images.unsplash.com/photo-1583265627959-fb7042f5133b?q=80&w=300&auto=format&fit=crop',
  'Book Ticket',
  2
);

-- ============================================
-- 8. USEFUL VIEWS
-- ============================================

-- View: Full itinerary with day count and activity count
CREATE OR REPLACE VIEW itinerary_summary AS
SELECT 
  i.*,
  COUNT(DISTINCT d.id) as total_days,
  COUNT(DISTINCT a.id) as total_activities,
  SUM(CASE WHEN a.price IS NOT NULL THEN a.price ELSE 0 END) as calculated_cost
FROM itinerary i
LEFT JOIN itinerary_day d ON d.itinerary_id = i.id
LEFT JOIN itinerary_activity a ON a.itinerary_id = i.id
GROUP BY i.id;

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to get full itinerary with all nested data as JSON
CREATE OR REPLACE FUNCTION get_full_itinerary(p_itinerary_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', i.id,
    'title', i.title,
    'slug', i.slug,
    'description', i.description,
    'duration', i.duration,
    'country', i.country,
    'countryFlag', i.country_flag,
    'dates', i.dates_display,
    'travelers', i.travelers,
    'avgCost', i.avg_cost_display,
    'coverImage', i.cover_image_url,
    'days', (
      SELECT json_agg(
        json_build_object(
          'day', d.day_number,
          'date', d.date_display,
          'title', d.title,
          'activities', (
            SELECT json_agg(
              json_build_object(
                'id', a.id,
                'time', a.time,
                'title', a.title,
                'type', a.type,
                'location', a.location,
                'price', a.price_display,
                'priceNote', a.price_note,
                'image', a.image_url,
                'actionLabel', a.action_label,
                'coordinates', ARRAY[a.latitude, a.longitude]
              ) ORDER BY a.sort_order
            )
            FROM itinerary_activity a
            WHERE a.day_id = d.id
          )
        ) ORDER BY d.day_number
      )
      FROM itinerary_day d
      WHERE d.itinerary_id = i.id
    )
  ) INTO result
  FROM itinerary i
  WHERE i.id = p_itinerary_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DONE! Your itinerary tables are ready.
-- ============================================

-- Example usage:
-- SELECT * FROM get_full_itinerary('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
-- SELECT * FROM itinerary_summary;
