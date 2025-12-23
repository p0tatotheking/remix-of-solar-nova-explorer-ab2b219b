-- Create user_profiles table for display names and avatars
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
CREATE POLICY "Anyone can read profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profiles" ON public.user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.user_profiles FOR UPDATE USING (true);

-- Create friend_nicknames table for user-specific nicknames
CREATE TABLE public.friend_nicknames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  nickname TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friend_nicknames ENABLE ROW LEVEL SECURITY;

-- RLS policies for friend_nicknames
CREATE POLICY "Anyone can read nicknames" ON public.friend_nicknames FOR SELECT USING (true);
CREATE POLICY "Anyone can insert nicknames" ON public.friend_nicknames FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update nicknames" ON public.friend_nicknames FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete nicknames" ON public.friend_nicknames FOR DELETE USING (true);