-- Create uploaded_music table to store music metadata
CREATE TABLE public.uploaded_music (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT 'Unknown Artist',
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.uploaded_music ENABLE ROW LEVEL SECURITY;

-- Anyone can view uploaded music
CREATE POLICY "Anyone can view uploaded music"
ON public.uploaded_music
FOR SELECT
USING (true);

-- Only admins can insert music (via RPC function)
CREATE POLICY "No direct insert on uploaded_music"
ON public.uploaded_music
FOR INSERT
WITH CHECK (false);

-- Only admins can delete music (via RPC function)
CREATE POLICY "No direct delete on uploaded_music"
ON public.uploaded_music
FOR DELETE
USING (false);

-- Create storage bucket for music files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('music', 'music', true, 52428800, ARRAY['audio/mpeg', 'audio/mp3']);

-- Storage policies - anyone can read
CREATE POLICY "Anyone can read music files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'music');

-- Only admins can upload music files
CREATE POLICY "Admins can upload music files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'music' AND public.has_role((SELECT id FROM public.app_users WHERE username = current_setting('request.jwt.claims', true)::json->>'sub'), 'admin'));

-- Create function for admin to upload music metadata
CREATE OR REPLACE FUNCTION public.add_uploaded_music(
  p_admin_id UUID,
  p_title TEXT,
  p_artist TEXT,
  p_file_path TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can upload music';
  END IF;
  
  INSERT INTO public.uploaded_music (title, artist, file_path, uploaded_by)
  VALUES (p_title, p_artist, p_file_path, p_admin_id)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Create function to delete uploaded music
CREATE OR REPLACE FUNCTION public.delete_uploaded_music(
  p_admin_id UUID,
  p_music_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete music';
  END IF;
  
  DELETE FROM public.uploaded_music WHERE id = p_music_id;
  RETURN TRUE;
END;
$$;