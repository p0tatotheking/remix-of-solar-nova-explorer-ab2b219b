
ALTER TABLE public.user_profiles
ADD COLUMN popups_disabled boolean DEFAULT false,
ADD COLUMN transitions_disabled boolean DEFAULT false,
ADD COLUMN layout_mode text DEFAULT 'grid';
