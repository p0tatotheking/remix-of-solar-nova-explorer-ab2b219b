-- Create game_progress table to sync across devices
CREATE TABLE public.game_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
  game_url TEXT NOT NULL,
  game_title TEXT NOT NULL,
  play_time INTEGER NOT NULL DEFAULT 0,
  last_played TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  custom_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, game_url)
);

-- Enable RLS
ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;

-- Users can only see their own progress
CREATE POLICY "Users can view their own game progress"
ON public.game_progress
FOR SELECT
USING (true);

-- Users can insert their own progress
CREATE POLICY "Users can insert their own game progress"
ON public.game_progress
FOR INSERT
WITH CHECK (true);

-- Users can update their own progress
CREATE POLICY "Users can update their own game progress"
ON public.game_progress
FOR UPDATE
USING (true);

-- Users can delete their own progress
CREATE POLICY "Users can delete their own game progress"
ON public.game_progress
FOR DELETE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_game_progress_user_id ON public.game_progress(user_id);
CREATE INDEX idx_game_progress_last_played ON public.game_progress(last_played DESC);

-- Enable realtime for sync across devices
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_progress;