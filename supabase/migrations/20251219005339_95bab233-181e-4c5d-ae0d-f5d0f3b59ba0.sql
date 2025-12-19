-- Add genre column to uploaded_music
ALTER TABLE public.uploaded_music ADD COLUMN IF NOT EXISTS genre text DEFAULT 'Other';
ALTER TABLE public.uploaded_music ADD COLUMN IF NOT EXISTS cover_url text;

-- Create user_playlists table
CREATE TABLE public.user_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on playlists
ALTER TABLE public.user_playlists ENABLE ROW LEVEL SECURITY;

-- Playlist RLS policies
CREATE POLICY "Anyone can read playlists" ON public.user_playlists FOR SELECT USING (true);
CREATE POLICY "Anyone can insert playlists" ON public.user_playlists FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update playlists" ON public.user_playlists FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete playlists" ON public.user_playlists FOR DELETE USING (true);

-- Create playlist_songs table (junction table)
CREATE TABLE public.playlist_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.user_playlists(id) ON DELETE CASCADE,
  music_id UUID NOT NULL REFERENCES public.uploaded_music(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, music_id)
);

-- Enable RLS on playlist_songs
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

-- Playlist songs RLS policies
CREATE POLICY "Anyone can read playlist songs" ON public.playlist_songs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert playlist songs" ON public.playlist_songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete playlist songs" ON public.playlist_songs FOR DELETE USING (true);

-- Create favorite_songs table
CREATE TABLE public.favorite_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  music_id UUID NOT NULL REFERENCES public.uploaded_music(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, music_id)
);

-- Enable RLS on favorites
ALTER TABLE public.favorite_songs ENABLE ROW LEVEL SECURITY;

-- Favorite songs RLS policies
CREATE POLICY "Anyone can read favorites" ON public.favorite_songs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert favorites" ON public.favorite_songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete favorites" ON public.favorite_songs FOR DELETE USING (true);