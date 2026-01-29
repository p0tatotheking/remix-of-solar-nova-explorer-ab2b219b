-- Create table for user uploaded music favorites
CREATE TABLE public.user_music_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  music_id UUID NOT NULL REFERENCES public.user_uploaded_music(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, music_id)
);

-- Enable RLS
ALTER TABLE public.user_music_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own favorites" 
ON public.user_music_favorites 
FOR SELECT 
USING (true);

CREATE POLICY "Users can add their own favorites" 
ON public.user_music_favorites 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can delete their own favorites" 
ON public.user_music_favorites 
FOR DELETE 
USING (true);

-- Create table for user uploaded music in playlists
CREATE TABLE public.user_music_playlist_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.youtube_music_playlists(id) ON DELETE CASCADE,
  music_id UUID NOT NULL REFERENCES public.user_uploaded_music(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, music_id)
);

-- Enable RLS
ALTER TABLE public.user_music_playlist_songs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view playlist songs" 
ON public.user_music_playlist_songs 
FOR SELECT 
USING (true);

CREATE POLICY "Users can add songs to playlists" 
ON public.user_music_playlist_songs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can remove songs from playlists" 
ON public.user_music_playlist_songs 
FOR DELETE 
USING (true);