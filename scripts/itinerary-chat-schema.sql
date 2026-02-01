-- =============================================================
-- Itinerary AI Chat Tables - Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor
-- =============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- 1. ITINERARY CONVERSATIONS TABLE
-- Stores each conversation session between user and AI
-- =============================================================
CREATE TABLE IF NOT EXISTS itinerary_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title VARCHAR(255) DEFAULT 'New Conversation',
  destination VARCHAR(255),
  duration VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_itinerary_conversations_user_id ON itinerary_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_conversations_status ON itinerary_conversations(status);
CREATE INDEX IF NOT EXISTS idx_itinerary_conversations_updated_at ON itinerary_conversations(updated_at DESC);

-- =============================================================
-- 2. ITINERARY MESSAGES TABLE
-- Stores individual messages in each conversation
-- =============================================================
CREATE TABLE IF NOT EXISTS itinerary_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES itinerary_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_itinerary_messages_conversation_id ON itinerary_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_messages_created_at ON itinerary_messages(created_at);

-- =============================================================
-- 3. ITINERARY DOCUMENTS TABLE
-- Stores finalized itinerary documents created by AI
-- =============================================================
CREATE TABLE IF NOT EXISTS itinerary_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES itinerary_conversations(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  destination VARCHAR(255) NOT NULL,
  country VARCHAR(100),
  country_flag VARCHAR(10),
  duration VARCHAR(100) NOT NULL,
  description TEXT,
  dates VARCHAR(100),
  travelers VARCHAR(100),
  avg_cost VARCHAR(100),
  cover_image TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster document queries
CREATE INDEX IF NOT EXISTS idx_itinerary_documents_user_id ON itinerary_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_documents_slug ON itinerary_documents(slug);
CREATE INDEX IF NOT EXISTS idx_itinerary_documents_status ON itinerary_documents(status);
CREATE INDEX IF NOT EXISTS idx_itinerary_documents_conversation_id ON itinerary_documents(conversation_id);

-- =============================================================
-- 4. ITINERARY DAYS TABLE
-- Stores day-by-day schedule for each document
-- =============================================================
CREATE TABLE IF NOT EXISTS itinerary_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES itinerary_documents(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster day queries
CREATE INDEX IF NOT EXISTS idx_itinerary_days_document_id ON itinerary_days(document_id);

-- =============================================================
-- 5. ITINERARY ACTIVITIES TABLE
-- Stores individual activities for each day
-- =============================================================
CREATE TABLE IF NOT EXISTS itinerary_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  time VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('flight', 'hotel', 'restaurant', 'attraction', 'transport', 'other')),
  location VARCHAR(255),
  description TEXT,
  price VARCHAR(100),
  price_note VARCHAR(255),
  image TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  booking_url TEXT,
  action_label VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster activity queries
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_day_id ON itinerary_activities(day_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_type ON itinerary_activities(type);

-- =============================================================
-- 6. ITINERARY ATTACHMENTS TABLE
-- Stores document attachments in chat messages
-- =============================================================
CREATE TABLE IF NOT EXISTS itinerary_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES itinerary_messages(id) ON DELETE CASCADE,
  document_id UUID REFERENCES itinerary_documents(id) ON DELETE SET NULL,
  type VARCHAR(50) DEFAULT 'itinerary' CHECK (type IN ('itinerary', 'image', 'file')),
  title VARCHAR(255),
  preview_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster attachment queries
CREATE INDEX IF NOT EXISTS idx_itinerary_attachments_message_id ON itinerary_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_attachments_document_id ON itinerary_attachments(document_id);

-- =============================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for itinerary_conversations
DROP TRIGGER IF EXISTS update_itinerary_conversations_updated_at ON itinerary_conversations;
CREATE TRIGGER update_itinerary_conversations_updated_at
  BEFORE UPDATE ON itinerary_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for itinerary_documents
DROP TRIGGER IF EXISTS update_itinerary_documents_updated_at ON itinerary_documents;
CREATE TRIGGER update_itinerary_documents_updated_at
  BEFORE UPDATE ON itinerary_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation title from first user message
CREATE OR REPLACE FUNCTION update_conversation_title()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE itinerary_conversations
    SET title = CASE 
      WHEN title = 'New Conversation' THEN LEFT(NEW.content, 100)
      ELSE title
    END
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update conversation title
DROP TRIGGER IF EXISTS update_conversation_title_trigger ON itinerary_messages;
CREATE TRIGGER update_conversation_title_trigger
  AFTER INSERT ON itinerary_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_title();

-- =============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable these if you're using Supabase Auth
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE itinerary_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_attachments ENABLE ROW LEVEL SECURITY;

-- Policies for itinerary_conversations
CREATE POLICY "Users can view their own conversations"
  ON itinerary_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON itinerary_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON itinerary_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON itinerary_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for itinerary_messages (inherit from conversation ownership)
CREATE POLICY "Users can view messages in their conversations"
  ON itinerary_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_conversations
      WHERE id = itinerary_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their conversations"
  ON itinerary_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_conversations
      WHERE id = itinerary_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Policies for itinerary_documents
CREATE POLICY "Users can view their own documents"
  ON itinerary_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
  ON itinerary_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON itinerary_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON itinerary_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for itinerary_days (inherit from document ownership)
CREATE POLICY "Users can view days in their documents"
  ON itinerary_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_documents
      WHERE id = itinerary_days.document_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage days in their documents"
  ON itinerary_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_documents
      WHERE id = itinerary_days.document_id
      AND user_id = auth.uid()
    )
  );

-- Policies for itinerary_activities (inherit from day/document ownership)
CREATE POLICY "Users can view activities in their itineraries"
  ON itinerary_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN itinerary_documents doc ON d.document_id = doc.id
      WHERE d.id = itinerary_activities.day_id
      AND doc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage activities in their itineraries"
  ON itinerary_activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days d
      JOIN itinerary_documents doc ON d.document_id = doc.id
      WHERE d.id = itinerary_activities.day_id
      AND doc.user_id = auth.uid()
    )
  );

-- Policies for itinerary_attachments (inherit from message ownership)
CREATE POLICY "Users can view attachments in their messages"
  ON itinerary_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_messages m
      JOIN itinerary_conversations c ON m.conversation_id = c.id
      WHERE m.id = itinerary_attachments.message_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage attachments in their messages"
  ON itinerary_attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_messages m
      JOIN itinerary_conversations c ON m.conversation_id = c.id
      WHERE m.id = itinerary_attachments.message_id
      AND c.user_id = auth.uid()
    )
  );

-- =============================================================
-- HELPER VIEWS
-- =============================================================

-- View for conversation list with last message preview
CREATE OR REPLACE VIEW itinerary_conversation_list AS
SELECT 
  c.id,
  c.user_id,
  c.title,
  c.destination,
  c.duration,
  c.status,
  c.created_at,
  c.updated_at,
  (
    SELECT content FROM itinerary_messages 
    WHERE conversation_id = c.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) as last_message,
  (
    SELECT COUNT(*) FROM itinerary_messages 
    WHERE conversation_id = c.id
  ) as message_count,
  (
    SELECT COUNT(*) FROM itinerary_attachments a
    JOIN itinerary_messages m ON a.message_id = m.id
    WHERE m.conversation_id = c.id AND a.type = 'itinerary'
  ) as document_count
FROM itinerary_conversations c;

-- View for full document with all days and activities
CREATE OR REPLACE VIEW itinerary_document_full AS
SELECT 
  d.id,
  d.user_id,
  d.conversation_id,
  d.title,
  d.slug,
  d.destination,
  d.country,
  d.country_flag,
  d.duration,
  d.description,
  d.dates,
  d.travelers,
  d.avg_cost,
  d.cover_image,
  d.status,
  d.created_at,
  d.updated_at,
  (
    SELECT json_agg(
      json_build_object(
        'id', day.id,
        'day_number', day.day_number,
        'date', day.date,
        'title', day.title,
        'description', day.description,
        'activities', (
          SELECT json_agg(
            json_build_object(
              'id', a.id,
              'time', a.time,
              'title', a.title,
              'type', a.type,
              'location', a.location,
              'description', a.description,
              'price', a.price,
              'price_note', a.price_note,
              'image', a.image,
              'latitude', a.latitude,
              'longitude', a.longitude,
              'booking_url', a.booking_url,
              'action_label', a.action_label
            ) ORDER BY a.sort_order, a.time
          )
          FROM itinerary_activities a
          WHERE a.day_id = day.id
        )
      ) ORDER BY day.day_number
    )
    FROM itinerary_days day
    WHERE day.document_id = d.id
  ) as days
FROM itinerary_documents d;

-- =============================================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================================

-- Uncomment below to insert sample data for testing

/*
-- Sample conversation
INSERT INTO itinerary_conversations (id, user_id, title, destination, duration, status)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'YOUR_USER_ID_HERE',
  '5-day Paris Itinerary',
  'Paris, France',
  '5 days',
  'completed'
);

-- Sample messages
INSERT INTO itinerary_messages (conversation_id, role, content)
VALUES 
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'user', 'Can you make me a 5-day itinerary for Paris?'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'assistant', 'Here''s a suggested **5-day itinerary for Paris** 🇫🇷:\n\n• **Day 1:** Explore the Eiffel Tower and Champs-Élysées, with a Seine river cruise in the evening.\n• **Day 2:** Visit the Louvre, Musée d''Orsay, and a walking tour in Le Marais.\n• **Day 3:** Day trip to Versailles Palace.\n• **Day 4:** Montmartre & Sacré-Cœur, plus a local food tour.\n• **Day 5:** Relax at Luxembourg Gardens, then shopping in Saint-Germain.\n\nDo you want me to optimize it for budget, luxury, or fast-paced sightseeing?');
*/
