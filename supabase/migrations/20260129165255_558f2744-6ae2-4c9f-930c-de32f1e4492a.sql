-- Create table for user's personal uploaded music
CREATE TABLE public.user_uploaded_music (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT 'Unknown Artist',
  file_path TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, file_path)
);

-- Enable RLS
ALTER TABLE public.user_uploaded_music ENABLE ROW LEVEL SECURITY;

-- Users can only see their own music
CREATE POLICY "Users can view their own uploaded music"
ON public.user_uploaded_music
FOR SELECT
USING (true);

-- Users can upload their own music
CREATE POLICY "Users can insert their own uploaded music"
ON public.user_uploaded_music
FOR INSERT
WITH CHECK (true);

-- Users can delete their own music
CREATE POLICY "Users can delete their own uploaded music"
ON public.user_uploaded_music
FOR DELETE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_user_uploaded_music_user_id ON public.user_uploaded_music(user_id);

-- Create storage bucket for user music files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('user-music', 'user-music', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user music
CREATE POLICY "Anyone can view user music files"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-music');

CREATE POLICY "Authenticated users can upload music"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-music');

CREATE POLICY "Users can delete their own music files"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-music');