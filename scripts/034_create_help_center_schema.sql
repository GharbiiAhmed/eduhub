-- Create help center categories table
CREATE TABLE IF NOT EXISTS public.help_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Icon name for the category
  order_index INTEGER DEFAULT 0,
  section TEXT NOT NULL CHECK (section IN ('website', 'courses')), -- 'website' for admin, 'courses' for instructor
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create help articles table
CREATE TABLE IF NOT EXISTS public.help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.help_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL, -- Full article content (markdown or HTML)
  excerpt TEXT, -- Short description for preview
  section TEXT NOT NULL CHECK (section IN ('website', 'courses')), -- 'website' for admin, 'courses' for instructor
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  order_index INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create help article tags (for better searchability)
CREATE TABLE IF NOT EXISTS public.help_article_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(article_id, tag)
);

-- Create help article feedback table
CREATE TABLE IF NOT EXISTS public.help_article_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(article_id, user_id) -- One feedback per user per article
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON public.help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_section ON public.help_articles(section);
CREATE INDEX IF NOT EXISTS idx_help_articles_status ON public.help_articles(status);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON public.help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_categories_section ON public.help_categories(section);
CREATE INDEX IF NOT EXISTS idx_help_article_tags_article ON public.help_article_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_help_article_feedback_article ON public.help_article_feedback(article_id);

-- Enable RLS
ALTER TABLE public.help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_article_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for help_categories
-- Everyone can view published categories
CREATE POLICY "Anyone can view published categories" ON public.help_categories
  FOR SELECT USING (true);

-- Only admins can manage website categories, instructors can manage courses categories
CREATE POLICY "Admins can manage website categories" ON public.help_categories
  FOR ALL USING (
    section = 'website' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Instructors can manage courses categories" ON public.help_categories
  FOR ALL USING (
    section = 'courses' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'instructor')
  );

-- RLS Policies for help_articles
-- Everyone can view published articles
CREATE POLICY "Anyone can view published articles" ON public.help_articles
  FOR SELECT USING (status = 'published');

-- Authors, admins, and instructors can view their own drafts
CREATE POLICY "Authors can view their own articles" ON public.help_articles
  FOR SELECT USING (
    author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'))
  );

-- Only admins can manage website articles, instructors can manage courses articles
CREATE POLICY "Admins can manage website articles" ON public.help_articles
  FOR ALL USING (
    section = 'website' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Instructors can manage courses articles" ON public.help_articles
  FOR ALL USING (
    section = 'courses' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'instructor')
  );

-- RLS Policies for help_article_tags
-- Everyone can view tags
CREATE POLICY "Anyone can view article tags" ON public.help_article_tags
  FOR SELECT USING (true);

-- Only admins and instructors can manage tags (based on article section)
CREATE POLICY "Admins can manage website article tags" ON public.help_article_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.help_articles 
      WHERE id = help_article_tags.article_id 
      AND section = 'website'
    ) AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Instructors can manage courses article tags" ON public.help_article_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.help_articles 
      WHERE id = help_article_tags.article_id 
      AND section = 'courses'
    ) AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'instructor')
  );

-- RLS Policies for help_article_feedback
-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback" ON public.help_article_feedback
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Anyone can create feedback (for anonymous users)
CREATE POLICY "Anyone can create feedback" ON public.help_article_feedback
  FOR INSERT WITH CHECK (true);

-- Users can update their own feedback
CREATE POLICY "Users can update their own feedback" ON public.help_article_feedback
  FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can delete their own feedback
CREATE POLICY "Users can delete their own feedback" ON public.help_article_feedback
  FOR DELETE USING (user_id = auth.uid() OR user_id IS NULL);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_help_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_help_categories_updated_at
  BEFORE UPDATE ON public.help_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_help_updated_at();

CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_help_updated_at();

-- Create function to update article view count
CREATE OR REPLACE FUNCTION increment_article_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.help_articles
  SET view_count = view_count + 1
  WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Insert default categories for website section
INSERT INTO public.help_categories (name, slug, description, icon, section, order_index) VALUES
  ('Getting Started', 'getting-started', 'Learn the basics of using our platform', 'BookOpen', 'website', 1),
  ('Account & Billing', 'account-billing', 'Manage your account and billing information', 'CreditCard', 'website', 2),
  ('Technical Support', 'technical-support', 'Get help with technical issues', 'Settings', 'website', 3),
  ('Mobile App', 'mobile-app', 'Using our mobile applications', 'Smartphone', 'website', 4),
  ('Privacy & Security', 'privacy-security', 'Learn about privacy and security features', 'Shield', 'website', 5)
ON CONFLICT (slug) DO NOTHING;

-- Insert default categories for courses section
INSERT INTO public.help_categories (name, slug, description, icon, section, order_index) VALUES
  ('Course Creation', 'course-creation', 'Learn how to create and manage courses', 'PlusCircle', 'courses', 1),
  ('Content Management', 'content-management', 'Manage your course content and materials', 'FileText', 'courses', 2),
  ('Student Engagement', 'student-engagement', 'Engage with your students effectively', 'Users', 'courses', 3),
  ('Analytics & Reports', 'analytics-reports', 'Track your course performance and analytics', 'BarChart', 'courses', 4),
  ('Pricing & Subscriptions', 'pricing-subscriptions', 'Set up pricing and subscription options', 'DollarSign', 'courses', 5)
ON CONFLICT (slug) DO NOTHING;











































