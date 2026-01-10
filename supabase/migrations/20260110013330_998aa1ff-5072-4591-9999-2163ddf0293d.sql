-- Create YouTube watch history table
CREATE TABLE public.youtube_watch_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  thumbnail TEXT,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.youtube_watch_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own watch history"
ON public.youtube_watch_history
FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own watch history"
ON public.youtube_watch_history
FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own watch history"
ON public.youtube_watch_history
FOR DELETE
USING (auth.uid()::text = user_id::text);

-- Create index for faster queries
CREATE INDEX idx_youtube_watch_history_user_id ON public.youtube_watch_history(user_id);
CREATE INDEX idx_youtube_watch_history_watched_at ON public.youtube_watch_history(watched_at DESC);

-- Create YouTube music listen history table
CREATE TABLE public.youtube_music_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  thumbnail TEXT,
  listened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.youtube_music_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own music history"
ON public.youtube_music_history
FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own music history"
ON public.youtube_music_history
FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own music history"
ON public.youtube_music_history
FOR DELETE
USING (auth.uid()::text = user_id::text);

-- Create index for faster queries
CREATE INDEX idx_youtube_music_history_user_id ON public.youtube_music_history(user_id);
CREATE INDEX idx_youtube_music_history_listened_at ON public.youtube_music_history(listened_at DESC);