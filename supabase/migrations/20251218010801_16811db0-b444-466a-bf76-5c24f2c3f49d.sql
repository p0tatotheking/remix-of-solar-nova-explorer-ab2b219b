
-- Create friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create friend_requests table
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL,
  from_username TEXT NOT NULL,
  to_user_id UUID NOT NULL,
  to_username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_blocks table
CREATE TABLE public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Create direct_messages table
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  sender_username TEXT NOT NULL,
  receiver_id UUID NOT NULL,
  receiver_username TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  muted_user_id UUID NOT NULL,
  mute_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, muted_user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for friendships
CREATE POLICY "Anyone can read friendships" ON public.friendships FOR SELECT USING (true);
CREATE POLICY "Anyone can insert friendships" ON public.friendships FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete friendships" ON public.friendships FOR DELETE USING (true);

-- RLS policies for friend_requests
CREATE POLICY "Anyone can read friend_requests" ON public.friend_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert friend_requests" ON public.friend_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update friend_requests" ON public.friend_requests FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete friend_requests" ON public.friend_requests FOR DELETE USING (true);

-- RLS policies for user_blocks
CREATE POLICY "Anyone can read user_blocks" ON public.user_blocks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user_blocks" ON public.user_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete user_blocks" ON public.user_blocks FOR DELETE USING (true);

-- RLS policies for direct_messages
CREATE POLICY "Anyone can read direct_messages" ON public.direct_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert direct_messages" ON public.direct_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update direct_messages" ON public.direct_messages FOR UPDATE USING (true);

-- RLS policies for notification_settings
CREATE POLICY "Anyone can read notification_settings" ON public.notification_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert notification_settings" ON public.notification_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notification_settings" ON public.notification_settings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete notification_settings" ON public.notification_settings FOR DELETE USING (true);

-- Enable realtime for direct_messages and friend_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;

-- Create function to get all app users (for DM list)
CREATE OR REPLACE FUNCTION public.get_all_app_users()
RETURNS TABLE (
  id UUID,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.username, au.created_at
  FROM app_users au
  ORDER BY au.username;
END;
$$;
