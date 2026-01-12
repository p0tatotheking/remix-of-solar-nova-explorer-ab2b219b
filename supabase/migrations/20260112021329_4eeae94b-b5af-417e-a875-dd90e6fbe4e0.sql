-- Add theme and background settings columns to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS theme_preset TEXT DEFAULT 'purple',
ADD COLUMN IF NOT EXISTS custom_bg_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS custom_bg_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS glass_enabled BOOLEAN DEFAULT true;