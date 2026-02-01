-- Add Google Places enrichment fields to itinerary_activities table
-- Run this migration to enable rich activity data with real photos and booking info

-- Add new columns for Google Places data
ALTER TABLE itinerary_activities
ADD COLUMN IF NOT EXISTS place_id TEXT,
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS user_ratings_total INTEGER,
ADD COLUMN IF NOT EXISTS price_level INTEGER,
ADD COLUMN IF NOT EXISTS photos TEXT[], -- Array of photo URLs
ADD COLUMN IF NOT EXISTS open_now BOOLEAN,
ADD COLUMN IF NOT EXISTS opening_hours TEXT[], -- Array of weekday text
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS editorial_summary TEXT,
ADD COLUMN IF NOT EXISTS top_review JSONB; -- { author_name, rating, text }

-- Add an index on place_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_place_id 
ON itinerary_activities(place_id) 
WHERE place_id IS NOT NULL;

-- Add an index on rating for sorting by rating
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_rating 
ON itinerary_activities(rating) 
WHERE rating IS NOT NULL;

-- Comment on the new columns
COMMENT ON COLUMN itinerary_activities.place_id IS 'Google Places API place_id for this location';
COMMENT ON COLUMN itinerary_activities.rating IS 'Google Places rating (1.0-5.0)';
COMMENT ON COLUMN itinerary_activities.user_ratings_total IS 'Total number of user ratings on Google';
COMMENT ON COLUMN itinerary_activities.price_level IS 'Google price level (0=Free, 1=$, 2=$$, 3=$$$, 4=$$$$)';
COMMENT ON COLUMN itinerary_activities.photos IS 'Array of Google Places photo URLs';
COMMENT ON COLUMN itinerary_activities.open_now IS 'Whether the place is currently open';
COMMENT ON COLUMN itinerary_activities.opening_hours IS 'Array of formatted opening hours by day';
COMMENT ON COLUMN itinerary_activities.website IS 'Official website URL';
COMMENT ON COLUMN itinerary_activities.phone_number IS 'Formatted phone number';
COMMENT ON COLUMN itinerary_activities.google_maps_url IS 'Direct link to Google Maps';
COMMENT ON COLUMN itinerary_activities.editorial_summary IS 'Google editorial summary/overview';
COMMENT ON COLUMN itinerary_activities.top_review IS 'Top Google review as JSON: {author_name, rating, text}';
