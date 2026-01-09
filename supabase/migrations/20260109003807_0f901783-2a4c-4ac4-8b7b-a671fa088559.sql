-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Enable realtime for direct messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- Enable realtime for UNO tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.uno_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.uno_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.uno_invites;