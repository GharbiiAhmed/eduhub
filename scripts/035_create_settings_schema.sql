-- Create user_settings table for individual user preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification settings
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  course_updates BOOLEAN DEFAULT TRUE,
  new_messages BOOLEAN DEFAULT TRUE,
  marketing_emails BOOLEAN DEFAULT FALSE,
  weekly_digest BOOLEAN DEFAULT TRUE,
  achievement_alerts BOOLEAN DEFAULT TRUE,
  reminder_emails BOOLEAN DEFAULT TRUE,
  meeting_reminders BOOLEAN DEFAULT TRUE,
  forum_notifications BOOLEAN DEFAULT TRUE,
  
  -- Privacy settings
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'instructors', 'students', 'private')),
  show_email BOOLEAN DEFAULT FALSE,
  show_phone BOOLEAN DEFAULT FALSE,
  show_location BOOLEAN DEFAULT TRUE,
  allow_messages BOOLEAN DEFAULT TRUE,
  show_progress BOOLEAN DEFAULT TRUE,
  show_certificates BOOLEAN DEFAULT TRUE,
  data_sharing BOOLEAN DEFAULT FALSE,
  
  -- Preferences
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko')),
  timezone TEXT DEFAULT 'UTC',
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  
  -- Additional profile fields
  phone TEXT,
  location TEXT,
  website TEXT,
  birthday DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create website_settings table for admin-managed global settings
CREATE TABLE IF NOT EXISTS public.website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'text' CHECK (setting_type IN ('text', 'number', 'boolean', 'json')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'email', 'payment', 'features', 'seo', 'social', 'maintenance')),
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE, -- Whether this setting can be accessed publicly
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
-- Users can view and update their own settings
CREATE POLICY "Users can view their own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for website_settings
-- Everyone can view public settings
CREATE POLICY "Anyone can view public website settings" ON public.website_settings
  FOR SELECT USING (is_public = TRUE);

-- Only admins can view all settings
CREATE POLICY "Admins can view all website settings" ON public.website_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can manage website settings
CREATE POLICY "Admins can manage website settings" ON public.website_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_website_settings_key ON public.website_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_website_settings_category ON public.website_settings(category);

-- Create trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_website_settings_updated_at
  BEFORE UPDATE ON public.website_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default website settings
INSERT INTO public.website_settings (setting_key, setting_value, setting_type, category, description, is_public) VALUES
  -- General Settings
  ('site_name', 'EduHub', 'text', 'general', 'Website name', TRUE),
  ('site_description', 'Your gateway to world-class education', 'text', 'general', 'Website description', TRUE),
  ('site_logo', '', 'text', 'general', 'Website logo URL', TRUE),
  ('contact_email', 'support@eduhub.com', 'text', 'general', 'Contact email address', TRUE),
  ('contact_phone', '+1 (555) 123-4567', 'text', 'general', 'Contact phone number', TRUE),
  ('support_hours', 'Mon-Fri, 9AM-6PM EST', 'text', 'general', 'Support hours', TRUE),
  
  -- Email Settings
  ('email_from_name', 'EduHub', 'text', 'email', 'Email sender name', FALSE),
  ('email_from_address', 'noreply@eduhub.com', 'text', 'email', 'Email sender address', FALSE),
  ('email_smtp_host', '', 'text', 'email', 'SMTP host', FALSE),
  ('email_smtp_port', '587', 'number', 'email', 'SMTP port', FALSE),
  ('email_smtp_user', '', 'text', 'email', 'SMTP username', FALSE),
  ('email_smtp_password', '', 'text', 'email', 'SMTP password', FALSE),
  
  -- Payment Settings
  ('stripe_publishable_key', '', 'text', 'payment', 'Stripe publishable key', FALSE),
  ('stripe_secret_key', '', 'text', 'payment', 'Stripe secret key', FALSE),
  ('currency', 'USD', 'text', 'payment', 'Default currency', TRUE),
  ('currency_symbol', '$', 'text', 'payment', 'Currency symbol', TRUE),
  
  -- Feature Flags
  ('enable_courses', 'true', 'boolean', 'features', 'Enable courses feature', TRUE),
  ('enable_books', 'true', 'boolean', 'features', 'Enable books feature', TRUE),
  ('enable_forums', 'true', 'boolean', 'features', 'Enable forums feature', TRUE),
  ('enable_meetings', 'true', 'boolean', 'features', 'Enable meetings feature', TRUE),
  ('enable_subscriptions', 'true', 'boolean', 'features', 'Enable subscriptions', TRUE),
  ('enable_certificates', 'true', 'boolean', 'features', 'Enable certificates', TRUE),
  ('enable_ratings', 'true', 'boolean', 'features', 'Enable course ratings', TRUE),
  
  -- SEO Settings
  ('meta_title', 'EduHub - Learn & Grow', 'text', 'seo', 'Default meta title', TRUE),
  ('meta_description', 'Your gateway to world-class education', 'text', 'seo', 'Default meta description', TRUE),
  ('meta_keywords', 'education, courses, learning, online learning', 'text', 'seo', 'Default meta keywords', TRUE),
  
  -- Social Media
  ('facebook_url', '', 'text', 'social', 'Facebook page URL', TRUE),
  ('twitter_url', '', 'text', 'social', 'Twitter profile URL', TRUE),
  ('linkedin_url', '', 'text', 'social', 'LinkedIn page URL', TRUE),
  ('instagram_url', '', 'text', 'social', 'Instagram profile URL', TRUE),
  ('youtube_url', '', 'text', 'social', 'YouTube channel URL', TRUE),
  
  -- Maintenance
  ('maintenance_mode', 'false', 'boolean', 'maintenance', 'Enable maintenance mode', FALSE),
  ('maintenance_message', 'We are currently performing maintenance. Please check back soon.', 'text', 'maintenance', 'Maintenance message', TRUE)
ON CONFLICT (setting_key) DO NOTHING;










































