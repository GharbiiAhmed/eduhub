-- Create chatbot logs table
CREATE TABLE IF NOT EXISTS public.chatbot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  context JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create chatbot log translations table
CREATE TABLE IF NOT EXISTS public.chatbot_log_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_log_id UUID NOT NULL REFERENCES public.chatbot_logs(id) ON DELETE CASCADE,
  lang VARCHAR(5) NOT NULL,
  query_translation TEXT,
  response_translation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chatbot_log_id, lang)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_user_id ON public.chatbot_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_course_id ON public.chatbot_logs(course_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_timestamp ON public.chatbot_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_log_translations_log_id ON public.chatbot_log_translations(chatbot_log_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_log_translations_lang ON public.chatbot_log_translations(lang);

-- Enable RLS
ALTER TABLE public.chatbot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_log_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chatbot_logs
CREATE POLICY "Users can view their own chatbot logs" ON public.chatbot_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own chatbot logs" ON public.chatbot_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all chatbot logs" ON public.chatbot_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for chatbot_log_translations
CREATE POLICY "Users can view translations for their chatbot logs" ON public.chatbot_log_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chatbot_logs 
      WHERE chatbot_logs.id = chatbot_log_translations.chatbot_log_id 
      AND chatbot_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert translations for their chatbot logs" ON public.chatbot_log_translations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chatbot_logs 
      WHERE chatbot_logs.id = chatbot_log_translations.chatbot_log_id 
      AND chatbot_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all chatbot log translations" ON public.chatbot_log_translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );


