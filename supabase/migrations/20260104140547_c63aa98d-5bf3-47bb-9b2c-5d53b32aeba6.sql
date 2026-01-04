-- Create UNO games table
CREATE TABLE public.uno_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  creator_username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby', -- lobby, playing, finished
  allow_stacking BOOLEAN NOT NULL DEFAULT true,
  turn_time_limit INTEGER DEFAULT NULL, -- seconds, null = no limit
  max_players INTEGER NOT NULL DEFAULT 4,
  current_turn_player_id UUID DEFAULT NULL,
  direction INTEGER NOT NULL DEFAULT 1, -- 1 = clockwise, -1 = counter-clockwise
  current_color TEXT DEFAULT NULL, -- red, blue, green, yellow
  draw_pile JSONB DEFAULT '[]'::jsonb,
  discard_pile JSONB DEFAULT '[]'::jsonb,
  winner_id UUID DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  finished_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create UNO players table (players in a game)
CREATE TABLE public.uno_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.uno_games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  hand JSONB DEFAULT '[]'::jsonb,
  turn_order INTEGER NOT NULL,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(game_id, user_id)
);

-- Create UNO invites table
CREATE TABLE public.uno_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.uno_games(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  from_username TEXT NOT NULL,
  to_user_id UUID NOT NULL,
  to_username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(game_id, to_user_id)
);

-- Enable RLS
ALTER TABLE public.uno_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uno_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uno_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uno_games
CREATE POLICY "Anyone can read uno_games"
ON public.uno_games FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert uno_games"
ON public.uno_games FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update uno_games"
ON public.uno_games FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete uno_games"
ON public.uno_games FOR DELETE
USING (true);

-- RLS Policies for uno_players
CREATE POLICY "Anyone can read uno_players"
ON public.uno_players FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert uno_players"
ON public.uno_players FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update uno_players"
ON public.uno_players FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete uno_players"
ON public.uno_players FOR DELETE
USING (true);

-- RLS Policies for uno_invites
CREATE POLICY "Anyone can read uno_invites"
ON public.uno_invites FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert uno_invites"
ON public.uno_invites FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update uno_invites"
ON public.uno_invites FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete uno_invites"
ON public.uno_invites FOR DELETE
USING (true);

-- Enable realtime for game state updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.uno_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.uno_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.uno_invites;