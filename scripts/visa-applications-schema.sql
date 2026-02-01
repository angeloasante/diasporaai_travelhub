-- Visa Applications Schema - Supabase PostgreSQL
-- Run this in your Supabase SQL Editor

-- ============================================================
-- VISA APPLICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS visa_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Applicant Information
  applicant_name TEXT NOT NULL,
  email TEXT NOT NULL,
  date_of_birth DATE,
  passport_number TEXT,
  phone TEXT,
  
  -- Origin & Destination
  origin_country TEXT NOT NULL,
  origin_country_code TEXT,
  destination_country TEXT NOT NULL,
  destination_country_code TEXT,
  destination_flag TEXT,
  
  -- Visa Details
  visa_type TEXT NOT NULL DEFAULT 'Tourist Visa',
  travel_reason TEXT,
  application_number TEXT UNIQUE,
  
  -- Status & Progress
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'interview', 'processing', 'approved', 'denied')),
  
  -- VFS Slot Checking
  vfs_check_enabled BOOLEAN DEFAULT false,
  vfs_email TEXT,
  vfs_password_encrypted TEXT, -- Store encrypted passwords only
  preferred_date_from DATE,
  preferred_date_to DATE,
  vfs_center TEXT,
  visa_category TEXT,
  visa_sub_category TEXT,
  
  -- VFS Monitoring
  monitoring_enabled BOOLEAN DEFAULT false,
  monitoring_job_id TEXT,
  last_slot_check TIMESTAMPTZ,
  slot_found BOOLEAN DEFAULT false,
  slot_date TEXT,
  slot_time TEXT,
  slot_location TEXT,
  slot_confirmation_code TEXT,
  
  -- Requirements checklist (stored as JSONB for flexibility)
  requirements JSONB DEFAULT '[]'::jsonb,
  
  -- Costs breakdown
  costs JSONB DEFAULT '[]'::jsonb,
  
  -- Additional Fields
  referral_source TEXT,
  notes TEXT,
  
  -- Metadata
  user_id TEXT, -- Can link to auth user if needed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_visa_applications_email ON visa_applications(email);
CREATE INDEX IF NOT EXISTS idx_visa_applications_user_id ON visa_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_visa_applications_status ON visa_applications(status);
CREATE INDEX IF NOT EXISTS idx_visa_applications_destination ON visa_applications(destination_country_code);
CREATE INDEX IF NOT EXISTS idx_visa_applications_created ON visa_applications(created_at DESC);

-- ============================================================
-- VFS SLOT CHECK HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS vfs_slot_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES visa_applications(id) ON DELETE CASCADE,
  
  -- Check details
  source_country TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  visa_center TEXT,
  visa_category TEXT,
  visa_sub_category TEXT,
  
  -- Results
  success BOOLEAN NOT NULL,
  slots_found INTEGER DEFAULT 0,
  slots_data JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  
  -- Metadata
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slot_checks_application ON vfs_slot_checks(application_id);
CREATE INDEX IF NOT EXISTS idx_slot_checks_date ON vfs_slot_checks(checked_at DESC);

-- ============================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS visa_applications_updated_at ON visa_applications;
CREATE TRIGGER visa_applications_updated_at
  BEFORE UPDATE ON visa_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ENABLE REALTIME FOR VISA APPLICATIONS
-- ============================================================
-- Enable realtime subscriptions on the visa_applications table
ALTER PUBLICATION supabase_realtime ADD TABLE visa_applications;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS
ALTER TABLE visa_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vfs_slot_checks ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to manage their own applications (based on email)
CREATE POLICY "Users can view their own applications"
  ON visa_applications FOR SELECT
  USING (true); -- For now allow all reads, can restrict by auth later

CREATE POLICY "Users can create applications"
  ON visa_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own applications"
  ON visa_applications FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own applications"
  ON visa_applications FOR DELETE
  USING (true);

-- Slot checks policies
CREATE POLICY "Users can view slot checks"
  ON vfs_slot_checks FOR SELECT
  USING (true);

CREATE POLICY "Users can create slot checks"
  ON vfs_slot_checks FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================
-- Uncomment to insert sample data:
/*
INSERT INTO visa_applications (
  applicant_name,
  email,
  origin_country,
  origin_country_code,
  destination_country,
  destination_country_code,
  destination_flag,
  visa_type,
  travel_reason,
  application_number,
  status,
  vfs_check_enabled,
  requirements,
  costs
) VALUES (
  'John Doe',
  'john@example.com',
  'Nigeria',
  'NG',
  'Germany',
  'DE',
  '🇩🇪',
  'Study Visa',
  'Study / Education',
  '#1234',
  'draft',
  true,
  '[
    {"id": "1", "label": "Passport Photo", "completed": false},
    {"id": "2", "label": "Application Form", "completed": true},
    {"id": "3", "label": "Bank Statement", "completed": false},
    {"id": "4", "label": "Travel Itinerary", "completed": false}
  ]'::jsonb,
  '[
    {"label": "Embassy Fee", "amount": 75},
    {"label": "Service Fee", "amount": 25}
  ]'::jsonb
);
*/
