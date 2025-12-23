-- Create message reactions table for chat messages
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  emoji TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'server', -- 'server' or 'dm'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read reactions" ON public.message_reactions
FOR SELECT USING (true);

CREATE POLICY "Anyone can add reactions" ON public.message_reactions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete reactions" ON public.message_reactions
FOR DELETE USING (true);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;