-- Create table for YouTube music playlists
CREATE TABLE public.youtube_music_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for songs in YouTube music playlists
CREATE TABLE public.youtube_playlist_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.youtube_music_playlists(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  thumbnail TEXT,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, video_id)
);

-- Enable RLS
ALTER TABLE public.youtube_music_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_playlist_songs ENABLE ROW LEVEL SECURITY;

-- RLS policies for playlists
CREATE POLICY "Users can view their own playlists"
  ON public.youtube_music_playlists FOR SELECT
  USING (true);

CREATE POLICY "Users can create playlists"
  ON public.youtube_music_playlists FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own playlists"
  ON public.youtube_music_playlists FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own playlists"
  ON public.youtube_music_playlists FOR DELETE
  USING (true);

-- RLS policies for playlist songs
CREATE POLICY "Users can view playlist songs"
  ON public.youtube_playlist_songs FOR SELECT
  USING (true);

CREATE POLICY "Users can add songs to playlists"
  ON public.youtube_playlist_songs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can remove songs from playlists"
  ON public.youtube_playlist_songs FOR DELETE
  USING (true);