-- Create a table to track user online status
CREATE TABLE public.user_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read status (needed for showing last seen)
CREATE POLICY "Anyone can read user status"
ON public.user_status
FOR SELECT
USING (true);

-- Allow anyone to insert/update status (controlled at app layer)
CREATE POLICY "Anyone can insert user status"
ON public.user_status
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update user status"
ON public.user_status
FOR UPDATE
USING (true);